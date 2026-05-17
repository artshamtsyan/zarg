import { and, eq, ilike, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";
import { parse, isValid } from "date-fns";

interface ResolveWhenArgs {
  tz: string;
  phrase: string;
}

// Parse natural-language datetimes ("today 19:00", "tomorrow 8am",
// "Wed 7pm", "2026-05-17T19:00"). Falls back to "now" if unparseable.
export function resolveWhen({ tz, phrase }: ResolveWhenArgs): Date {
  const now = new Date();
  const cleaned = phrase.trim().toLowerCase();

  // ISO-ish — try Date.parse first
  const direct = new Date(phrase);
  if (!isNaN(direct.getTime()) && /[\d]{4}-[\d]{2}-[\d]{2}/.test(phrase)) {
    return direct;
  }

  const today = toZonedTime(now, tz);
  let day = today;
  let leftover = cleaned;

  // Day shifts
  if (leftover.startsWith("today")) {
    leftover = leftover.replace(/^today\s*/, "");
  } else if (leftover.startsWith("tomorrow")) {
    day = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    leftover = leftover.replace(/^tomorrow\s*/, "");
  } else if (leftover.startsWith("yesterday")) {
    day = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    leftover = leftover.replace(/^yesterday\s*/, "");
  } else {
    // Weekday name?
    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const found = weekdays.findIndex((w) => leftover.startsWith(w) || leftover.startsWith(w.slice(0, 3)));
    if (found >= 0) {
      const todayDow = today.getDay();
      const shift = (found - todayDow + 7) % 7 || 7; // next occurrence including today→+0 maps to +7
      day = new Date(today.getTime() + shift * 24 * 60 * 60 * 1000);
      leftover = leftover.replace(new RegExp(`^${weekdays[found].slice(0, 3)}\\w*\\s*`), "");
    }
  }

  // Time portion. Accept "19:00", "7pm", "7:30pm", "8am".
  let hours = 19;
  let minutes = 0;
  const timeMatch = leftover.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3];
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
  }

  const local = new Date(day);
  local.setHours(hours, minutes, 0, 0);
  // local is in TZ already; convert back to UTC
  const localIso = formatInTimeZone(local, tz, "yyyy-MM-dd'T'HH:mm:ss");
  return fromZonedTime(localIso, tz);
}

// ─── Person resolution ─────────────────────────────────────────────

export async function findPersonByName(tenantId: string, name: string) {
  const db = getDb();
  const trimmed = name.trim();
  if (!trimmed) return null;
  // Exact (case-insensitive)
  const exact = await db
    .select()
    .from(schema.people)
    .where(and(eq(schema.people.tenantId, tenantId), ilike(schema.people.name, trimmed)))
    .limit(1);
  if (exact[0]) return exact[0];
  // First-name match
  const firstName = trimmed.split(/\s+/)[0];
  if (!firstName) return null;
  const partial = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.tenantId, tenantId),
        ilike(schema.people.name, `${firstName}%`)
      )
    )
    .limit(2);
  if (partial.length === 1) return partial[0];
  return null;
}

// ─── Event resolution ──────────────────────────────────────────────

export async function findEventNearWhen(tenantId: string, whenIso: Date) {
  const db = getDb();
  const windowStart = new Date(whenIso.getTime() - 90 * 60 * 1000);
  const windowEnd = new Date(whenIso.getTime() + 90 * 60 * 1000);
  const rows = await db
    .select()
    .from(schema.events)
    .where(
      and(
        eq(schema.events.tenantId, tenantId),
        sql`${schema.events.startsAt} BETWEEN ${windowStart} AND ${windowEnd}`
      )
    )
    .orderBy(schema.events.startsAt)
    .limit(1);
  return rows[0] ?? null;
}

// ─── Writers ───────────────────────────────────────────────────────

export interface RecordPersonInput {
  name: string;
  phone?: string;
  status?: string;
  segment?: string;
  notes?: string;
}

export async function recordPerson(tenantId: string, input: RecordPersonInput) {
  const db = getDb();
  const existing = await findPersonByName(tenantId, input.name);
  if (existing) return { ok: true, personId: existing.id, alreadyExisted: true };
  const [row] = await db
    .insert(schema.people)
    .values({
      tenantId,
      name: input.name,
      phone: input.phone ?? null,
      status: input.status ?? "active",
      segment: input.segment ?? null,
      notes: input.notes ?? null,
      source: "owner_logged",
    })
    .returning({ id: schema.people.id });
  return { ok: true, personId: row.id, alreadyExisted: false };
}

export interface RecordEventInput {
  when: string;
  duration_min?: number;
  staff_name?: string;
  capacity?: number;
  type?: string;
  status?: string;
}

export async function recordEvent(
  tenantId: string,
  tz: string,
  input: RecordEventInput
) {
  const db = getDb();
  const startsAt = resolveWhen({ tz, phrase: input.when });
  const existing = await findEventNearWhen(tenantId, startsAt);
  if (existing) return { ok: true, eventId: existing.id, alreadyExisted: true };
  const [row] = await db
    .insert(schema.events)
    .values({
      tenantId,
      startsAt,
      durationMin: input.duration_min ?? 60,
      staffName: input.staff_name ?? null,
      capacity: input.capacity ?? 12,
      type: input.type ?? null,
      status:
        (input.status as "scheduled" | "completed" | "cancelled" | undefined) ??
        (startsAt.getTime() < Date.now() ? "completed" : "scheduled"),
      source: "owner_logged",
    })
    .returning({ id: schema.events.id });
  return { ok: true, eventId: row.id, alreadyExisted: false };
}

export interface RecordBookingInput {
  person_name: string;
  event_when: string;
  status?: string;
  attendance?: string;
}

export async function recordBooking(
  tenantId: string,
  tz: string,
  input: RecordBookingInput
) {
  const db = getDb();
  const person = await findPersonByName(tenantId, input.person_name);
  if (!person) {
    return { ok: false, error: `No person found matching "${input.person_name}". Add them first with record_person.` };
  }
  const whenIso = resolveWhen({ tz, phrase: input.event_when });
  const event = await findEventNearWhen(tenantId, whenIso);
  if (!event) {
    return {
      ok: false,
      error: `No event found near ${input.event_when}. Add it first with record_event using the same when.`,
    };
  }
  const [row] = await db
    .insert(schema.bookings)
    .values({
      tenantId,
      personId: person.id,
      eventId: event.id,
      status: input.status ?? "booked",
      attendance: input.attendance ?? null,
      source: "owner_logged",
    })
    .returning({ id: schema.bookings.id });
  return { ok: true, bookingId: row.id, personId: person.id, eventId: event.id };
}

export interface RecordPaymentInput {
  person_name?: string;
  amount_minor: number;
  currency?: string;
  method?: string;
  status?: string;
  kind?: string;
  when?: string;
}

export async function recordPayment(
  tenantId: string,
  tz: string,
  input: RecordPaymentInput
) {
  const db = getDb();
  let personId: string | null = null;
  if (input.person_name) {
    const p = await findPersonByName(tenantId, input.person_name);
    personId = p?.id ?? null;
  }
  const paidAt = input.when ? resolveWhen({ tz, phrase: input.when }) : new Date();
  const [row] = await db
    .insert(schema.payments)
    .values({
      tenantId,
      personId,
      amountMinor: input.amount_minor,
      currency: input.currency ?? "AMD",
      method: input.method ?? "cash",
      status: input.status ?? "successful",
      kind: input.kind ?? "single",
      paidAt,
      source: "owner_logged",
    })
    .returning({ id: schema.payments.id });
  return { ok: true, paymentId: row.id, personId };
}
