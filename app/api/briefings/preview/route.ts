import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { and, desc, eq } from "drizzle-orm";
import { buildSnapshot } from "@/lib/db/snapshot";
import { generateBriefingBody } from "@/lib/ai/briefing";
import { ageTenantData } from "@/lib/jobs/age-data";
import { loadProfile } from "@/lib/db/discovery";
import { formatInTimeZone } from "date-fns-tz";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return new Response("Unauthorized", { status: 401 });
  const tenantId = session.user.tenantId;
  const ownerName = session.user.fullName ?? session.user.name ?? null;

  const url = new URL(req.url);
  const skipAge = url.searchParams.get("skipAge") === "1";

  const db = getDb();
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId)).limit(1);
  if (!tenant) return new Response("Tenant not found", { status: 404 });

  if (!skipAge) {
    try {
      await ageTenantData(tenantId);
    } catch (err) {
      console.warn("[briefing/preview] aging failed:", err);
    }
  }

  const snapshot = await buildSnapshot(tenantId, ownerName);
  const profile = await loadProfile(tenantId);
  const tz = snapshot.tenant.timezone;

  // Look up yesterday's briefing for continuity
  const forDate = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
  const yesterdayDate = formatInTimeZone(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    tz,
    "yyyy-MM-dd"
  );
  const [previousBriefing] = await db
    .select()
    .from(schema.briefings)
    .where(and(eq(schema.briefings.tenantId, tenantId), eq(schema.briefings.forDate, yesterdayDate)))
    .limit(1);

  const body = await generateBriefingBody({
    snapshot,
    profile: { entities: profile?.entities, goals: profile?.goals },
    yesterdayBriefingBody: previousBriefing?.bodyMarkdown ?? null,
  });

  // Persist (idempotent on tenant_id + for_date)
  const [existing] = await db
    .select()
    .from(schema.briefings)
    .where(and(eq(schema.briefings.tenantId, tenantId), eq(schema.briefings.forDate, forDate)))
    .limit(1);

  let row;
  if (existing) {
    [row] = await db
      .update(schema.briefings)
      .set({ bodyMarkdown: body, generatedAt: new Date(), status: "queued" })
      .where(eq(schema.briefings.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(schema.briefings)
      .values({
        tenantId,
        forDate,
        bodyMarkdown: body,
        status: "queued",
      })
      .returning();
  }

  return Response.json({
    ok: true,
    briefing: {
      id: row.id,
      forDate: row.forDate,
      body: row.bodyMarkdown,
      status: row.status,
      generatedAt: row.generatedAt,
    },
  });
}
