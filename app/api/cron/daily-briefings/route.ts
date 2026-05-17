import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { buildSnapshot } from "@/lib/db/snapshot";
import { generateBriefingBody } from "@/lib/ai/briefing";
import { ageTenantData } from "@/lib/jobs/age-data";
import { loadProfile } from "@/lib/db/discovery";
import { sendBriefingMessage } from "@/lib/telegram/send";
import { env } from "@/lib/env";
import { formatInTimeZone } from "date-fns-tz";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily cron. On Vercel Hobby this fires once per day (05:00 UTC).
 * We process every active tenant in one pass — the (tenant_id, for_date)
 * unique index makes the upsert idempotent against retries.
 *
 * For tenants whose owner has linked Telegram, we send the briefing as a DM
 * with inline action buttons. Otherwise we just generate and persist; the
 * dashboard renders it.
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

      // 1. Age data
      await ageTenantData(tenant.id);

      // 2. Build snapshot
      const [owner] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.tenantId, tenant.id))
        .limit(1);
      const snapshot = await buildSnapshot(tenant.id, owner?.fullName ?? null);
      const profile = await loadProfile(tenant.id);

      // 3. Generate body
      const body = await generateBriefingBody({
        snapshot,
        profile: { entities: profile?.entities, goals: profile?.goals },
      });

      // 4. Upsert briefing row
      const forDate = formatInTimeZone(nowUtc, tz, "yyyy-MM-dd");
      const [existing] = await db
        .select()
        .from(schema.briefings)
        .where(
          and(eq(schema.briefings.tenantId, tenant.id), eq(schema.briefings.forDate, forDate))
        )
        .limit(1);

      let briefingId: string;
      if (existing) {
        if (existing.status === "sent") {
          results.push({ tenantId: tenant.id, alreadySent: true });
          continue;
        }
        await db
          .update(schema.briefings)
          .set({ bodyMarkdown: body, generatedAt: new Date() })
          .where(eq(schema.briefings.id, existing.id));
        briefingId = existing.id;
      } else {
        const [row] = await db
          .insert(schema.briefings)
          .values({
            tenantId: tenant.id,
            forDate,
            bodyMarkdown: body,
            status: "queued",
          })
          .returning();
        briefingId = row.id;
      }

      // 5. Deliver via Telegram if linked
      if (owner?.telegramChatId && env.hasTelegram()) {
        try {
          const sent = await sendBriefingMessage({
            chatId: Number(owner.telegramChatId),
            body,
          });
          await db
            .update(schema.briefings)
            .set({
              status: "sent",
              telegramMessageId: sent.message_id,
              sentAt: new Date(),
            })
            .where(eq(schema.briefings.id, briefingId));
          results.push({ tenantId: tenant.id, sentViaTelegram: true, messageId: sent.message_id });
        } catch (err) {
          console.error(`[cron] Telegram send failed for tenant ${tenant.id}`, err);
          await db
            .update(schema.briefings)
            .set({
              status: "failed",
              error: err instanceof Error ? err.message : "telegram send error",
            })
            .where(eq(schema.briefings.id, briefingId));
          results.push({
            tenantId: tenant.id,
            error: err instanceof Error ? err.message : "telegram error",
          });
        }
      } else {
        results.push({ tenantId: tenant.id, status: "queued", reason: "no telegram link" });
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
