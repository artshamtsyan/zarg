import { auth } from "@/lib/auth/auth";
import { parseCsv } from "@/lib/sources/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return new Response("Unauthorized", { status: 401 });

  let text: string;
  let filename: string | undefined;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.startsWith("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return Response.json(
        { ok: false, error: `File too large (${file.size} bytes; max ${MAX_SIZE})` },
        { status: 413 }
      );
    }
    filename = file.name;
    text = await file.text();
  } else {
    const body = (await req.json().catch(() => ({}))) as { csv?: string; filename?: string };
    if (!body.csv) return Response.json({ ok: false, error: "Missing csv field" }, { status: 400 });
    text = body.csv;
    filename = body.filename;
  }

  try {
    const preview = parseCsv(text);
    return Response.json({ ok: true, filename, preview });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Parse failed" },
      { status: 400 }
    );
  }
}
