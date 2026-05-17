import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import type { SeedPayload } from "@/lib/ai/seed";

export async function insertSeed(tenantId: string, seed: SeedPayload) {
  const db = getDb();
  const now = Date.now();
  const hoursToDate = (h: number) => new Date(now + h * 60 * 60 * 1000);
  const daysAgoToDate = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000);
  const daysFromNowToDate = (d: number | undefined) =>
    d === undefined ? null : new Date(now + d * 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    // Wipe any previous seed (idempotent re-seed)
    await tx.delete(schema.payments).where(eq(schema.payments.tenantId, tenantId));
    await tx.delete(schema.packages).where(eq(schema.packages.tenantId, tenantId));
    await tx.delete(schema.bookings).where(eq(schema.bookings.tenantId, tenantId));
    await tx.delete(schema.events).where(eq(schema.events.tenantId, tenantId));
    await tx.delete(schema.people).where(eq(schema.people.tenantId, tenantId));

    // People
    const peopleRows = await tx
      .insert(schema.people)
      .values(
        seed.people.map((p) => ({
          tenantId,
          name: p.name,
          phone: p.phone ?? null,
          status: p.status,
          segment: p.segment ?? null,
          notes: p.notes ?? null,
          joinedAt: daysAgoToDate(p.joined_days_ago),
        }))
      )
      .returning({ id: schema.people.id });
    const personIds = peopleRows.map((r) => r.id);

    // Events
    const eventRows = await tx
      .insert(schema.events)
      .values(
        seed.events.map((e) => ({
          tenantId,
          startsAt: hoursToDate(e.start_offset_hours),
          durationMin: e.duration_min,
          staffName: e.staff_name,
          capacity: e.capacity,
          type: e.type ?? null,
          status: e.status,
        }))
      )
      .returning({ id: schema.events.id });
    const eventIds = eventRows.map((r) => r.id);

    // Bookings — only insert those whose indices resolve
    const validBookings = seed.bookings
      .filter((b) => personIds[b.person_index] && eventIds[b.event_index])
      .map((b) => ({
        tenantId,
        personId: personIds[b.person_index],
        eventId: eventIds[b.event_index],
        status: b.status,
        attendance: b.attendance ?? null,
      }));
    if (validBookings.length > 0) {
      await tx.insert(schema.bookings).values(validBookings);
    }

    // Payments
    const validPayments = seed.payments
      .map((p) => ({
        tenantId,
        personId: p.person_index !== undefined ? personIds[p.person_index] ?? null : null,
        amountMinor: p.amount_minor,
        currency: p.currency,
        method: p.method,
        status: p.status,
        ref: p.ref ?? null,
        paidAt: hoursToDate(p.paid_offset_hours),
        kind: p.kind,
      }))
      .filter((p) => p.amountMinor >= 0);
    if (validPayments.length > 0) {
      await tx.insert(schema.payments).values(validPayments);
    }

    // Packages
    const validPackages = seed.packages
      .filter((p) => personIds[p.person_index])
      .map((p) => ({
        tenantId,
        personId: personIds[p.person_index],
        kind: p.kind,
        visitsTotal: p.visits_total,
        visitsRemaining: p.visits_remaining,
        startedAt: daysAgoToDate(p.started_days_ago),
        expiresAt: daysFromNowToDate(p.expires_days_from_now),
        status: p.status,
      }));
    if (validPackages.length > 0) {
      await tx.insert(schema.packages).values(validPackages);
    }
  });
}

export interface SeedStats {
  people: number;
  events: number;
  bookings: number;
  payments: number;
  packages: number;
}

export async function countSeed(tenantId: string): Promise<SeedStats> {
  const db = getDb();
  const [p, e, b, pay, pk] = await Promise.all([
    db.$count(schema.people, eq(schema.people.tenantId, tenantId)),
    db.$count(schema.events, eq(schema.events.tenantId, tenantId)),
    db.$count(schema.bookings, eq(schema.bookings.tenantId, tenantId)),
    db.$count(schema.payments, eq(schema.payments.tenantId, tenantId)),
    db.$count(schema.packages, eq(schema.packages.tenantId, tenantId)),
  ]);
  return { people: p, events: e, bookings: b, payments: pay, packages: pk };
}
