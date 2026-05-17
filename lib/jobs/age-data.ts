import { and, eq, lt, lte, gt, sql, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";

/**
 * Slide the synthetic clock forward by one tick (typically run daily).
 * - Mark past scheduled events as completed, stamp attendance on bookings.
 * - Decrement packages.visits_remaining for attended bookings (approximation).
 * - Add a small handful of new bookings on upcoming events to keep the dataset alive.
 * - Add 0-2 new payments per day.
 *
 * This is intentionally cheap and procedural — the briefing then has fresh
 * material to talk about each morning without re-calling the LLM seed.
 */
export async function ageTenantData(tenantId: string): Promise<{
  eventsCompleted: number;
  attendanceStamped: number;
  bookingsAdded: number;
  paymentsAdded: number;
}> {
  const db = getDb();
  const now = new Date();
  let eventsCompleted = 0;
  let attendanceStamped = 0;
  let bookingsAdded = 0;
  let paymentsAdded = 0;

  // 1. Mark past scheduled events as completed.
  const completed = await db
    .update(schema.events)
    .set({ status: "completed" })
    .where(
      and(
        eq(schema.events.tenantId, tenantId),
        eq(schema.events.status, "scheduled"),
        lt(schema.events.startsAt, now)
      )
    )
    .returning({ id: schema.events.id });
  eventsCompleted = completed.length;

  // 2. For bookings on events that ended in the past with attendance=pending,
  //    stamp attended (90%) or no_show (10%).
  if (completed.length > 0) {
    const ids = completed.map((c) => c.id);
    const updated = await db
      .update(schema.bookings)
      .set({
        attendance: sql`CASE WHEN random() < 0.9 THEN 'attended' ELSE 'no_show' END`,
      })
      .where(
        and(
          eq(schema.bookings.tenantId, tenantId),
          eq(schema.bookings.attendance, "pending"),
          sql`${schema.bookings.eventId} IN (${sql.join(
            ids.map((i) => sql`${i}`),
            sql`, `
          )})`
        )
      )
      .returning({ id: schema.bookings.id });
    attendanceStamped = updated.length;
  }

  // 3. Add a tiny set of new bookings to upcoming events (keeps dataset alive)
  const upcomingEvents = await db
    .select({ id: schema.events.id, capacity: schema.events.capacity })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.tenantId, tenantId),
        eq(schema.events.status, "scheduled"),
        gt(schema.events.startsAt, now),
        lt(schema.events.startsAt, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
      )
    )
    .limit(8);

  const people = await db
    .select({ id: schema.people.id })
    .from(schema.people)
    .where(and(eq(schema.people.tenantId, tenantId), eq(schema.people.status, "active")))
    .limit(40);

  if (upcomingEvents.length > 0 && people.length > 0) {
    const toInsert: Array<{ tenantId: string; eventId: string; personId: string; status: string; attendance: string }> = [];
    const targetAdds = 2 + Math.floor(Math.random() * 3); // 2-4 new bookings
    for (let i = 0; i < targetAdds; i++) {
      const evt = upcomingEvents[Math.floor(Math.random() * upcomingEvents.length)];
      const person = people[Math.floor(Math.random() * people.length)];
      toInsert.push({
        tenantId,
        eventId: evt.id,
        personId: person.id,
        status: "booked",
        attendance: "pending",
      });
    }
    if (toInsert.length > 0) {
      await db.insert(schema.bookings).values(toInsert);
      bookingsAdded = toInsert.length;
    }
  }

  // 4. Maybe add 1-2 new payments at small amounts for variety
  if (people.length > 0) {
    const paymentCount = Math.floor(Math.random() * 2) + 1;
    const newPayments: Array<{
      tenantId: string;
      personId: string;
      amountMinor: number;
      currency: string;
      method: string;
      status: string;
      paidAt: Date;
      kind: string;
    }> = [];
    for (let i = 0; i < paymentCount; i++) {
      const person = people[Math.floor(Math.random() * people.length)];
      const amounts = [250000, 400000, 2000000, 3800000]; // 2500 / 4000 / 20000 / 38000
      newPayments.push({
        tenantId,
        personId: person.id,
        amountMinor: amounts[Math.floor(Math.random() * amounts.length)],
        currency: "AMD",
        method: Math.random() < 0.7 ? "card" : "cash",
        status: Math.random() < 0.9 ? "successful" : "pending",
        paidAt: new Date(now.getTime() - Math.floor(Math.random() * 8) * 60 * 60 * 1000),
        kind: Math.random() < 0.5 ? "single" : "package",
      });
    }
    if (newPayments.length > 0) {
      await db.insert(schema.payments).values(newPayments);
      paymentsAdded = newPayments.length;
    }
  }

  // 5. Mildly decay visits_remaining on a few random active packages (proxy for attendance)
  await db.execute(sql`
    UPDATE packages
    SET visits_remaining = GREATEST(visits_remaining - 1, 0)
    WHERE tenant_id = ${tenantId}
      AND status = 'active'
      AND visits_remaining > 0
      AND id IN (
        SELECT id FROM packages
        WHERE tenant_id = ${tenantId} AND status = 'active' AND visits_remaining > 0
        ORDER BY random() LIMIT 3
      )
  `);

  return { eventsCompleted, attendanceStamped, bookingsAdded, paymentsAdded };
}
