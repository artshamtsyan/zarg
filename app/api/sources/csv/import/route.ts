import { auth } from "@/lib/auth/auth";
import { importCsvForTenant } from "@/lib/sources/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  const result = await importCsvForTenant(session.user.tenantId, body);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
