import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { loadHistory } from "@/lib/db/discovery";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.tenantId) return new Response("Unauthorized", { status: 401 });
  const tenantId = session.user.tenantId;

  const db = getDb();
  const history = await loadHistory(tenantId);
  await db
    .update(schema.businessProfiles)
    .set({ rawTranscript: history })
    .where(eq(schema.businessProfiles.tenantId, tenantId));
  await db
    .update(schema.tenants)
    .set({ status: "active" })
    .where(eq(schema.tenants.id, tenantId));

  return Response.json({ ok: true });
}
