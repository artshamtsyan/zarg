import { and, eq, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { extractPeopleFromText, type ExtractedPerson } from "@/lib/sources/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/sources/extract — body: { text } → preview { people, source }
// POST /api/sources/extract?commit=1 — body: { people } → write rows
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return new Response("Unauthorized", { status: 401 });
  const tenantId = session.user.tenantId;

  const url = new URL(req.url);
  const commit = url.searchParams.get("commit") === "1";

  const body = (await req.json().catch(() => null)) as
    | { text?: string; people?: ExtractedPerson[] }
    | null;
  if (!body) return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  if (!commit) {
    // Preview path: run extractor, return the structured list
    const result = await extractPeopleFromText(tenantId, body.text ?? "");
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }

  // Commit path: take the (possibly edited) list and write rows
  const incoming = Array.isArray(body.people) ? body.people : [];
  if (incoming.length === 0) {
    return Response.json({ ok: false, error: "No people to import" }, { status: 400 });
  }

  const db = getDb();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const p of incoming) {
    const name = (p.name ?? "").trim();
    if (!name) {
      skipped++;
      continue;
    }
    try {
      const existing = await db
        .select({ id: schema.people.id })
        .from(schema.people)
        .where(
          and(eq(schema.people.tenantId, tenantId), ilike(schema.people.name, name))
        )
        .limit(1);
      const payload = {
        phone: p.phone || null,
        status: p.status ?? "active",
        segment: p.segment || null,
        notes: p.notes || null,
        source: "imported",
      };
      if (existing[0]) {
        await db.update(schema.people).set(payload).where(eq(schema.people.id, existing[0].id));
        updated++;
      } else {
        await db.insert(schema.people).values({ tenantId, name, ...payload });
        inserted++;
      }
    } catch (err) {
      errors.push(`row "${name}": ${err instanceof Error ? err.message : "insert failed"}`);
    }
  }

  // Track as an integration row so /dashboard/sources shows it
  const [integration] = await db
    .insert(schema.tenantIntegrations)
    .values({
      tenantId,
      kind: "csv_upload",
      status: "active",
      config: {
        filename: "Pasted text",
        rowCount: incoming.length,
        inserted,
        updated,
        skipped,
        importedAt: new Date().toISOString(),
        source: "extract",
      },
      lastSyncAt: new Date(),
    })
    .returning({ id: schema.tenantIntegrations.id });

  return Response.json({
    ok: errors.length === 0,
    inserted,
    updated,
    skipped,
    errors,
    integrationId: integration.id,
  });
}
