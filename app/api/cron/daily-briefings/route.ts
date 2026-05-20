import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { buildSnapshot } from "@/lib/db/snapshot";
import { generateBriefing } from "@/lib/ai/briefing";
import { ageTenantData } from "@/lib/jobs/age-data";
import { loadProfile } from "@/lib/db/discovery";
import { sendBriefingMessage, sendEveningRecap } from "@/lib/telegram/send";
import { env } from "@/lib/env";
import { formatInTimeZone } from "date-fns-tz";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Hourly cron (Vercel Pro). Two daily triggers per tenant:
 *   - Morning briefing at tenant.briefingLocalTime (default 08:00 local)
 *   - Evening recap at tenant.eveningRecapTime (default 20:00 local)
 *
 * For each tenant we compute the current local hour and dispatch when it
 * matches either target. Unique (tenant_id, for_date, kind) keeps it
 * idempotent against retries.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const authHeader = req.headers.get("authorization");
    const key = url.searchParams.get("key");
    if (authHeader !== `Bearer ${secret}` && key !== secret) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const db = getDb();
  const tenants = await db.select().from(schema.tenants).where(eq(schema.tenants.status, "active"));
  const nowUtc = new Date();

  const results: Array<Record<string, unknown>> = [];

  for (const tenant of tenants) {
    try {
      const tz = tenant.timezone || "Asia/Yerevan";
      const localHour = formatInTimeZone(nowUtc, tz, "HH");
      const morningHour = (tenant.briefingLocalTime || "08:00").split(":")[0];
      const eveningHour = (tenant.eveningRecapTime || "20:00").split(":")[0];

      const fireMorning = localHour === morningHour;
      const fireEvening = localHour === eveningHour && !fireMorning;

      if (!fireMorning && !fireEvening) {
        results.push({ tenantId: tenant.id, skipped: true, localHour });
        continue;
      }

      const [owner] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.tenantId, tenant.id))
        .limit(1);

      if (fireMorning) {
        const morningResult = await runMorning(tenant, owner ?? null, nowUtc, tz);
        results.push({ tenantId: tenant.id, ...morningResult });
      }

      if (fireEvening) {
        const eveningResult = await runEvening(tenant, owner ?? null, nowUtc, tz);
        results.push({ tenantId: tenant.id, ...eveningResult });
      }
    } catch (err) {
      console.error(`[cron] tenant ${tenant.id} failed:`, err);
      results.push({
        tenantId: tenant.id,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return Response.json({
    ok: true,
    nowUtc: nowUtc.toISOString(),
    tenantsConsidered: tenants.length,
    results,
  });
}

// ─── Morning briefing ──────────────────────────────────────────────────────

async function runMorning(
  tenant: typeof schema.tenants.$inferSelect,
  owner: typeof schema.users.$inferSelect | null,
  nowUtc: Date,
  tz: string
) {
  const db = getDb();
  await ageTenantData(tenant.id);
  const snapshot = await buildSnapshot(tenant.id, owner?.fullName ?? null);
  const profile = await loadProfile(tenant.id);

  const { body, suggestedActions } = await generateBriefing({
    tenantId: tenant.id,
    snapshot,
    profile: { entities: profile?.entities, goals: profile?.goals },
  });

  const forDate = formatInTimeZone(nowUtc, tz, "yyyy-MM-dd");
  const [existing] = await db
    .select()
    .from(schema.briefings)
    .where(
      and(
        eq(schema.briefings.tenantId, tenant.id),
        eq(schema.briefings.forDate, forDate),
        eq(schema.briefings.kind, "daily")
      )
    )
    .limit(1);

  let briefingId: string;
  if (existing) {
    if (existing.status === "sent") {
      return { kind: "daily", alreadySent: true };
    }
    await db
      .update(schema.briefings)
      .set({ bodyMarkdown: body, suggestedActions, generatedAt: new Date() })
      .where(eq(schema.briefings.id, existing.id));
    briefingId = existing.id;
  } else {
    const [row] = await db
      .insert(schema.briefings)
      .values({
        tenantId: tenant.id,
        forDate,
        kind: "daily",
        bodyMarkdown: body,
        suggestedActions,
        status: "queued",
      })
      .returning();
    briefingId = row.id;
  }

  if (!owner?.telegramChatId || !env.hasTelegram()) {
    return { kind: "daily", queued: true, reason: "no telegram link" };
  }

  try {
    const sent = await sendBriefingMessage({
      chatId: Number(owner.telegramChatId),
      body,
      briefingId,
      suggestedActions,
    });
    await db
      .update(schema.briefings)
      .set({ status: "sent", telegramMessageId: sent.message_id, sentAt: new Date() })
      .where(eq(schema.briefings.id, briefingId));
    return { kind: "daily", sent: true, messageId: sent.message_id };
  } catch (err) {
    await db
      .update(schema.briefings)
      .set({ status: "failed", error: err instanceof Error ? err.message : "send error" })
      .where(eq(schema.briefings.id, briefingId));
    return { kind: "daily", error: err instanceof Error ? err.message : "send error" };
  }
}

// ─── Evening recap ─────────────────────────────────────────────────────────

async function runEvening(
  tenant: typeof schema.tenants.$inferSelect,
  owner: typeof schema.users.$inferSelect | null,
  nowUtc: Date,
  tz: string
) {
  if (!owner?.telegramChatId || !env.hasTelegram()) {
    return { kind: "evening", skipped: true, reason: "no telegram link" };
  }

  const db = getDb();
  const snapshot = await buildSnapshot(tenant.id, owner.fullName ?? null);
  const profile = await loadProfile(tenant.id);
  const entities = (profile?.entities as { events_label?: string } | undefined) ?? {};
  const eventsLabel = entities.events_label ?? "classes";

  const forDate = formatInTimeZone(nowUtc, tz, "yyyy-MM-dd");
  const [existing] = await db
    .select()
    .from(schema.briefings)
    .where(
      and(
        eq(schema.briefings.tenantId, tenant.id),
        eq(schema.briefings.forDate, forDate),
        eq(schema.briefings.kind, "evening")
      )
    )
    .limit(1);

  if (existing?.status === "sent") {
    return { kind: "evening", alreadySent: true };
  }

  // Recap body is structurally produced from snapshot — no LLM needed,
  // saves a daily cost and keeps it predictable.
  const todayClasses = snapshot.today.events.map((e) => ({
    timeLocal: e.timeLocal,
    type: e.type,
    staff: e.staff,
  }));
  const bodyLines = [
    `How did today go?`,
    "",
    todayClasses.length === 0
      ? `No ${eventsLabel} scheduled today.`
      : `Today's ${eventsLabel}:`,
    ...todayClasses.map((c) =>
      `• ${[c.timeLocal, c.type, c.staff && `with ${c.staff}`].filter(Boolean).join(" ")}`
    ),
  ];
  const body = bodyLines.join("\n");

  let recapId: string;
  if (existing) {
    await db
      .update(schema.briefings)
      .set({ bodyMarkdown: body, generatedAt: new Date() })
      .where(eq(schema.briefings.id, existing.id));
    recapId = existing.id;
  } else {
    const [row] = await db
      .insert(schema.briefings)
      .values({
        tenantId: tenant.id,
        forDate,
        kind: "evening",
        bodyMarkdown: body,
        status: "queued",
      })
      .returning();
    recapId = row.id;
  }

  try {
    const sent = await sendEveningRecap({
      chatId: Number(owner.telegramChatId),
      ownerName: owner.fullName,
      todayClasses,
      recapId,
      eventsLabel,
    });
    await db
      .update(schema.briefings)
      .set({ status: "sent", telegramMessageId: sent.message_id, sentAt: new Date() })
      .where(eq(schema.briefings.id, recapId));
    return { kind: "evening", sent: true, messageId: sent.message_id };
  } catch (err) {
    await db
      .update(schema.briefings)
      .set({ status: "failed", error: err instanceof Error ? err.message : "send error" })
      .where(eq(schema.briefings.id, recapId));
    return { kind: "evening", error: err instanceof Error ? err.message : "send error" };
  }
}
