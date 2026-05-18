import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { loadHistory, loadProfile } from "@/lib/db/discovery";
import { generateSeed } from "@/lib/ai/seed";
import { insertSeed, countSeed } from "@/lib/db/seed";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.tenantId) return new Response("Unauthorized", { status: 401 });
  const tenantId = session.user.tenantId;

  const db = getDb();
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);
  if (!tenant) return new Response("Tenant not found", { status: 404 });

  const history = await loadHistory(tenantId);
  const profile = await loadProfile(tenantId);

  // 1) snapshot the conversation transcript
  await db
    .update(schema.businessProfiles)
    .set({ rawTranscript: history })
    .where(eq(schema.businessProfiles.tenantId, tenantId));

  // 2) generate seed dataset (LLM, fallback to Faker on failure)
  let source: "llm" | "fallback" = "fallback";
  try {
    const seed = await generateSeed({
      tenantId,
      tenant: {
        name: tenant.name,
        domain: tenant.domain,
        location: tenant.location,
      },
      profile: {
        entities: profile?.entities,
        goals: profile?.goals,
        keyWorkflows: profile?.keyWorkflows,
      },
    });
    source = seed.source;
    await insertSeed(tenantId, seed.payload);
  } catch (err) {
    console.error("[finalize] seed insert failed", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Seed insert failed" },
      { status: 500 }
    );
  }

  // 3) flip tenant to active
  await db
    .update(schema.tenants)
    .set({ status: "active" })
    .where(eq(schema.tenants.id, tenantId));

  const counts = await countSeed(tenantId);
  return Response.json({ ok: true, seedSource: source, counts });
}
