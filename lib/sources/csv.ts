import Papa from "papaparse";
import { z } from "zod";
import { and, eq, ilike } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CsvPreview {
  columns: string[];
  rowCount: number;
  sampleRows: Record<string, string>[];
  guess: Partial<Record<PeopleFieldKey, string>>;
}

export type PeopleFieldKey =
  | "name"
  | "phone"
  | "status"
  | "segment"
  | "notes"
  | "email"
  | "joined";

/** Map StarUp field → header in the uploaded CSV. */
export type ColumnMap = Partial<Record<PeopleFieldKey, string>>;

const STATUS_VALUES = new Set(["new", "trial", "active", "paused"]);

// Heuristics for matching column names. Order: most specific first.
const FIELD_HINTS: Record<PeopleFieldKey, RegExp[]> = {
  name: [/^name$/i, /^full.?name$/i, /^client$/i, /^customer$/i, /^student$/i, /^person$/i],
  phone: [/^phone$/i, /^mobile$/i, /^tel(ephone)?$/i, /^cell$/i, /^number$/i],
  status: [/^status$/i, /^state$/i],
  segment: [/^segment$/i, /^level$/i, /^tier$/i, /^category$/i, /^type$/i],
  notes: [/^notes?$/i, /^comment(s)?$/i, /^description$/i],
  email: [/^email$/i, /^mail$/i, /^e.?mail$/i],
  joined: [/^joined$/i, /^join.?date$/i, /^since$/i, /^member.?since$/i, /^created$/i],
};

function guessMapping(columns: string[]): ColumnMap {
  const out: ColumnMap = {};
  for (const [field, patterns] of Object.entries(FIELD_HINTS) as Array<
    [PeopleFieldKey, RegExp[]]
  >) {
    const hit = columns.find((c) => patterns.some((re) => re.test(c.trim())));
    if (hit) out[field] = hit;
  }
  return out;
}

// ─── Parse ─────────────────────────────────────────────────────────────────

/** Parse a CSV string and return preview info. */
export function parseCsv(text: string): CsvPreview {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`CSV parse failed: ${result.errors[0].message}`);
  }

  const columns =
    result.meta.fields?.map((c) => c.trim()).filter((c) => c.length > 0) ?? [];

  return {
    columns,
    rowCount: result.data.length,
    sampleRows: result.data.slice(0, 5),
    guess: guessMapping(columns),
  };
}

// ─── Import ────────────────────────────────────────────────────────────────

const importInputSchema = z.object({
  csv: z.string().min(1),
  mapping: z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    status: z.string().optional(),
    segment: z.string().optional(),
    notes: z.string().optional(),
    email: z.string().optional(),
    joined: z.string().optional(),
  }),
  filename: z.string().optional(),
});

export interface ImportResult {
  ok: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  integrationId: string;
}

export async function importCsvForTenant(
  tenantId: string,
  raw: unknown
): Promise<ImportResult> {
  const parsed = importInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [parsed.error.issues[0]?.message ?? "Invalid input"],
      integrationId: "",
    };
  }
  const { csv, mapping, filename } = parsed.data;

  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    return {
      ok: false,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [`CSV parse failed: ${result.errors[0].message}`],
      integrationId: "",
    };
  }

  const db = getDb();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of result.data) {
    const name = mapping.name ? (row[mapping.name] ?? "").trim() : "";
    if (!name) {
      skipped++;
      continue;
    }

    const phone = mapping.phone ? (row[mapping.phone] ?? "").trim() : null;
    const segment = mapping.segment ? (row[mapping.segment] ?? "").trim() : null;
    const notes = mapping.notes ? (row[mapping.notes] ?? "").trim() : null;
    const email = mapping.email ? (row[mapping.email] ?? "").trim() : null;

    let status = "active";
    if (mapping.status) {
      const v = (row[mapping.status] ?? "").trim().toLowerCase();
      if (STATUS_VALUES.has(v)) status = v;
    }

    let joinedAt: Date | null = null;
    if (mapping.joined) {
      const raw = (row[mapping.joined] ?? "").trim();
      const d = raw ? new Date(raw) : null;
      if (d && !isNaN(d.getTime())) joinedAt = d;
    }

    // Compose notes if email captured but no notes column mapping
    const notesPayload = [notes, email ? `email: ${email}` : null]
      .filter(Boolean)
      .join(" · ") || null;

    try {
      const existing = await db
        .select({ id: schema.people.id })
        .from(schema.people)
        .where(
          and(
            eq(schema.people.tenantId, tenantId),
            ilike(schema.people.name, name)
          )
        )
        .limit(1);

      if (existing[0]) {
        await db
          .update(schema.people)
          .set({
            phone: phone || null,
            status,
            segment: segment || null,
            notes: notesPayload,
            source: "imported",
            ...(joinedAt ? { joinedAt } : {}),
          })
          .where(eq(schema.people.id, existing[0].id));
        updated++;
      } else {
        await db.insert(schema.people).values({
          tenantId,
          name,
          phone: phone || null,
          status,
          segment: segment || null,
          notes: notesPayload,
          source: "imported",
          ...(joinedAt ? { joinedAt } : {}),
        });
        inserted++;
      }
    } catch (err) {
      errors.push(`row "${name}": ${err instanceof Error ? err.message : "insert failed"}`);
    }
  }

  // Record the integration so /dashboard/sources can show it
  const [integration] = await db
    .insert(schema.tenantIntegrations)
    .values({
      tenantId,
      kind: "csv_upload",
      status: "active",
      config: {
        filename: filename ?? "customers.csv",
        rowCount: result.data.length,
        inserted,
        updated,
        skipped,
        columnMap: mapping,
        importedAt: new Date().toISOString(),
      },
      lastSyncAt: new Date(),
    })
    .returning({ id: schema.tenantIntegrations.id });

  return {
    ok: errors.length === 0,
    inserted,
    updated,
    skipped,
    errors,
    integrationId: integration.id,
  };
}
