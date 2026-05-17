import { and, between, count, desc, eq, gte, isNull, lt, lte, ne, sql, sum } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export interface BriefingSnapshot {
  ownerName: string | null;
  tenant: {
    id: string;
    name: string;
    domain: string;
    timezone: string;
  };
  today: {
    date: string; // YYYY-MM-DD in tenant TZ
    weekday: string;
    events: Array<{
      timeLocal: string;
      staff: string | null;
      type: string | null;
      capacity: number;
      bookedCount: number;
    }>;
  };
  yesterday: {
    completedEvents: number;
    attendedCount: number;
    noShowCount: number;
    revenueMinor: number;
    currency: string;
  };
  week: {
    upcomingEventCount: number;
    upcomingByWeekday: Array<{ weekday: string; count: number }>;
    revenueLast7DaysMinor: number;
    currency: string;
  };
  pendingPayments: {
    count: number;
    totalMinor: number;
    currency: string;
  };
  newLeadsLast7Days: number;
  packagesExpiringSoon: Array<{ personName: string; expiresAt: string; visitsRemaining: number }>;
}

function startOfDayInTz(date: Date, tz: string): Date {
  const local = formatInTimeZone(date, tz, "yyyy-MM-dd'T'00:00:00");
  return fromZonedTime(local, tz);
}
function endOfDayInTz(date: Date, tz: string): Date {
  const local = formatInTimeZone(date, tz, "yyyy-MM-dd'T'23:59:59.999");
  return fromZonedTime(local, tz);
}

export async function buildSnapshot(
  tenantId: string,
  ownerName: string | null = null,
  forDate: Date = new Date()
): Promise<BriefingSnapshot> {
  const db = getDb();
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);
  if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

  const tz = tenant.timezone || "Asia/Yerevan";

  const todayStart = startOfDayInTz(forDate, tz);
  const todayEnd = endOfDayInTz(forDate, tz);
  const tomorrowStart = new Date(todayEnd.getTime() + 1);
  const weekAheadEnd = endOfDayInTz(new Date(forDate.getTime() + 7 * 24 * 60 * 60 * 1000), tz);
  const yesterdayStart = startOfDayInTz(new Date(forDate.getTime() - 24 * 60 * 60 * 1000), tz);
  const yesterdayEnd = endOfDayInTz(new Date(forDate.getTime() - 24 * 60 * 60 * 1000), tz);
  const last7Start = startOfDayInTz(new Date(forDate.getTime() - 7 * 24 * 60 * 60 * 1000), tz);

  // Today's events
  const todayEventsRaw = await db
    .select({
      id: schema.events.id,
      startsAt: schema.events.startsAt,
      staffName: schema.events.staffName,
      type: schema.events.type,
      capacity: schema.events.capacity,
    })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.tenantId, tenantId),
        gte(schema.events.startsAt, todayStart),
        lte(schema.events.startsAt, todayEnd),
        ne(schema.events.status, "cancelled")
      )
    )
    .orderBy(schema.events.startsAt);

  const todayEventIds = todayEventsRaw.map((e) => e.id);
  const bookingsByEvent = new Map<string, number>();
  if (todayEventIds.length > 0) {
    const bookings = await db
      .select({ eventId: schema.bookings.eventId, n: count() })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.tenantId, tenantId),
          ne(schema.bookings.status, "cancelled"),
          sql`${schema.bookings.eventId} IN (${sql.join(
            todayEventIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        )
      )
      .groupBy(schema.bookings.eventId);
    for (const b of bookings) bookingsByEvent.set(b.eventId, Number(b.n));
  }

  // Yesterday: completed events, attended/no-show, revenue
  const [yesterdayEventsRow] = await db
    .select({ n: count() })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.tenantId, tenantId),
        gte(schema.events.startsAt, yesterdayStart),
        lte(schema.events.startsAt, yesterdayEnd),
        eq(schema.events.status, "completed")
      )
    );

  const yesterdayAttRows = await db
    .select({ status: schema.bookings.attendance, n: count() })
    .from(schema.bookings)
    .innerJoin(schema.events, eq(schema.bookings.eventId, schema.events.id))
    .where(
      and(
        eq(schema.bookings.tenantId, tenantId),
        gte(schema.events.startsAt, yesterdayStart),
        lte(schema.events.startsAt, yesterdayEnd)
      )
    )
    .groupBy(schema.bookings.attendance);
  let attended = 0,
    noShow = 0;
  for (const r of yesterdayAttRows) {
    if (r.status === "attended") attended = Number(r.n);
    if (r.status === "no_show") noShow = Number(r.n);
  }

  const [yesterdayRev] = await db
    .select({ total: sum(schema.payments.amountMinor) })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.tenantId, tenantId),
        eq(schema.payments.status, "successful"),
        gte(schema.payments.paidAt, yesterdayStart),
        lte(schema.payments.paidAt, yesterdayEnd)
      )
    );

  // Upcoming events
  const [upcomingTotal] = await db
    .select({ n: count() })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.tenantId, tenantId),
        gte(schema.events.startsAt, tomorrowStart),
        lte(schema.events.startsAt, weekAheadEnd),
        ne(schema.events.status, "cancelled")
      )
    );

  const upcomingRaw = await db
    .select({ startsAt: schema.events.startsAt })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.tenantId, tenantId),
        gte(schema.events.startsAt, tomorrowStart),
        lte(schema.events.startsAt, weekAheadEnd),
        ne(schema.events.status, "cancelled")
      )
    );
  const upcomingByWeekday = new Map<string, number>();
  for (const e of upcomingRaw) {
    const wd = formatInTimeZone(e.startsAt, tz, "EEEE");
    upcomingByWeekday.set(wd, (upcomingByWeekday.get(wd) ?? 0) + 1);
  }

  // Last 7 days revenue
  const [last7Rev] = await db
    .select({ total: sum(schema.payments.amountMinor) })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.tenantId, tenantId),
        eq(schema.payments.status, "successful"),
        gte(schema.payments.paidAt, last7Start),
        lte(schema.payments.paidAt, todayEnd)
      )
    );

  // Pending payments (any time)
  const [pendingRow] = await db
    .select({ n: count(), total: sum(schema.payments.amountMinor) })
    .from(schema.payments)
    .where(and(eq(schema.payments.tenantId, tenantId), eq(schema.payments.status, "pending")));

  // New leads (people joined in last 7d)
  const [leadsRow] = await db
    .select({ n: count() })
    .from(schema.people)
    .where(and(eq(schema.people.tenantId, tenantId), gte(schema.people.joinedAt, last7Start)));

  // Packages expiring in next 7 days
  const packagesExpiringRaw = await db
    .select({
      personName: schema.people.name,
      expiresAt: schema.packages.expiresAt,
      visitsRemaining: schema.packages.visitsRemaining,
    })
    .from(schema.packages)
    .innerJoin(schema.people, eq(schema.packages.personId, schema.people.id))
    .where(
      and(
        eq(schema.packages.tenantId, tenantId),
        eq(schema.packages.status, "active"),
        gte(schema.packages.expiresAt, todayStart),
        lte(schema.packages.expiresAt, weekAheadEnd)
      )
    )
    .orderBy(schema.packages.expiresAt);

  // Currency: take the most recent successful payment's currency, or AMD as default
  const [recentPayment] = await db
    .select({ currency: schema.payments.currency })
    .from(schema.payments)
    .where(eq(schema.payments.tenantId, tenantId))
    .orderBy(desc(schema.payments.paidAt))
    .limit(1);
  const currency = recentPayment?.currency ?? "AMD";

  return {
    ownerName,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      timezone: tz,
    },
    today: {
      date: formatInTimeZone(forDate, tz, "yyyy-MM-dd"),
      weekday: formatInTimeZone(forDate, tz, "EEEE"),
      events: todayEventsRaw.map((e) => ({
        timeLocal: formatInTimeZone(e.startsAt, tz, "HH:mm"),
        staff: e.staffName,
        type: e.type,
        capacity: e.capacity,
        bookedCount: bookingsByEvent.get(e.id) ?? 0,
      })),
    },
    yesterday: {
      completedEvents: Number(yesterdayEventsRow?.n ?? 0),
      attendedCount: attended,
      noShowCount: noShow,
      revenueMinor: Number(yesterdayRev?.total ?? 0),
      currency,
    },
    week: {
      upcomingEventCount: Number(upcomingTotal?.n ?? 0),
      upcomingByWeekday: [...upcomingByWeekday.entries()]
        .map(([weekday, n]) => ({ weekday, count: n }))
        .sort((a, b) => b.count - a.count),
      revenueLast7DaysMinor: Number(last7Rev?.total ?? 0),
      currency,
    },
    pendingPayments: {
      count: Number(pendingRow?.n ?? 0),
      totalMinor: Number(pendingRow?.total ?? 0),
      currency,
    },
    newLeadsLast7Days: Number(leadsRow?.n ?? 0),
    packagesExpiringSoon: packagesExpiringRaw.map((p) => ({
      personName: p.personName,
      expiresAt: p.expiresAt ? formatInTimeZone(p.expiresAt, tz, "yyyy-MM-dd") : "—",
      visitsRemaining: p.visitsRemaining,
    })),
  };
}
