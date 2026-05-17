import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { buildSnapshot } from "@/lib/db/snapshot";
import { generateBriefingBody } from "@/lib/ai/briefing";
import { ageTenantData } from "@/lib/jobs/age-data";
import { loadProfile } from "@/lib/db/discovery";
import { formatInTimeZone } from "date-fns-tz";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Hourly cron — finds tenants whose briefing local time matches the current
 * UTC hour and generates today's briefing for each. Telegram send is wired
 * in Phase 5; for now the row is persisted with status="queued".
 *
 * Auth: optional CRON_SECRET header check. Vercel Cron sends a known header
 * automatically when deployed; for local trigger we accept ?key=...
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const auth = req.headers.get("authorization");
    const key = url.searchParams.get("key");
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const db = getDb();
  const tenants = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.status, "active"));

  const nowUtc = new Date();
  const currentUtcHour = nowUtc.getUTCHours();

  const results: Array<Record<string, unknown>> = [];

  for (const tenant of tenants) {
    try {
      const tz = tenant.timezone || "Asia/Yerevan";

      // Vercel Hobby fires this once per day, so we process every active
      // tenant in one pass. The (tenant_id, for_date) unique index on
      // briefings makes this idempotent — re-running the cron won't
      // duplicate today's row.

      // 1. Age data
      await ageTenantData(tenant.id);

      // 2. Build snapshot
      const snapshot = await buildSnapshot(tenant.id, null);
      const profile = await loadProfile(tenant.id);

      // 3. Generate body
      const body = await generateBriefingBody({
        snapshot,
        profile: { entities: profile?.entities, goals: profile?.goals },
      });

      // 4. Persist (idempotent)
      const forDate = formatInTimeZone(nowUtc, tz, "yyyy-MM-dd");
      const [existing] = await db
        .select()
        .from(schema.briefings)
        .where(
          and(eq(schema.briefings.tenantId, tenant.id), eq(schema.briefings.forDate, forDate))
        )
        .limit(1);
      if (existing) {
        results.push({ tenantId: tenant.id, alreadySent: true });
        continue;
      }

      const [row] = await db
        .insert(schema.briefings)
        .values({
          tenantId: tenant.id,
          forDate,
          bodyMarkdown: body,
          status: "queued",
        })
        .returning();

      // 5. Telegram delivery — Phase 5 wires this. For now leave queued.
      results.push({ tenantId: tenant.id, briefingId: row.id, status: row.status });
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
    currentUtcHour,
    tenantsConsidered: tenants.length,
    results,
  });
}
