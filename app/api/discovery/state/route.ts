import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { loadHistory, loadProfile } from "@/lib/db/discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return new Response("Unauthorized", { status: 401 });
  const tenantId = session.user.tenantId;

  const db = getDb();
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);
  const profile = await loadProfile(tenantId);
  const history = await loadHistory(tenantId);

  return Response.json({
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          location: tenant.location,
          status: tenant.status,
        }
      : null,
    profile: profile
      ? {
          currentState: profile.currentState,
          goals: profile.goals,
          keyWorkflows: profile.keyWorkflows,
          kpis: profile.kpis,
          entities: profile.entities,
          proposedFlow: profile.proposedFlow,
          mvpScope: profile.mvpScope,
          risks: profile.risks,
        }
      : null,
    messages: history.filter((m) => m.role !== "tool"),
    finalizedToolCalled: history.some((m) =>
      Array.isArray(m.toolCalls) &&
      (m.toolCalls as Array<{ name?: string }>).some((t) => t?.name === "finalize_profile")
    ),
  });
}
