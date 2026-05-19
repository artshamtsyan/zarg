"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/ui/Pill";
import { Ghost } from "@/components/ui/Ghost";

type Stage = "pick" | "map" | "importing" | "done";

interface Preview {
  columns: string[];
  rowCount: number;
  sampleRows: Record<string, string>[];
  guess: Partial<Record<FieldKey, string>>;
}

type FieldKey = "name" | "phone" | "status" | "segment" | "notes" | "email" | "joined";

const FIELDS: { key: FieldKey; label: string; required?: boolean; hint?: string }[] = [
  { key: "name", label: "Name", required: true, hint: "Required. Used to dedupe — same name updates the existing row." },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status", hint: "Maps to: new / trial / active / paused" },
  { key: "segment", label: "Segment / Level" },
  { key: "notes", label: "Notes" },
  { key: "email", label: "Email", hint: "Stored inside notes for now (no dedicated column yet)" },
  { key: "joined", label: "Joined date", hint: "Any parseable date string" },
];

interface ImportResult {
  ok: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export function CsvFlow() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [error, setError] = useState<string | null>(null);
  const [csv, setCsv] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStage("pick");
    setError(null);
    setCsv("");
    setFilename("");
    setPreview(null);
    setMapping({});
    setResult(null);
  };

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Only .csv files are supported. Export your spreadsheet as CSV first.");
        return;
      }
      const text = await file.text();
      setCsv(text);
      setFilename(file.name);

      const form = new FormData();
      form.set("file", file);
      const r = await fetch("/api/sources/csv/preview", { method: "POST", body: form });
      const body = await r.json();
      if (!body.ok) {
        setError(body.error ?? "Couldn't read the file");
        return;
      }
      setPreview(body.preview);
      setMapping(body.preview.guess);
      setStage("map");
    } finally {
      setBusy(false);
    }
  }, []);

  const setMap = (key: FieldKey, column: string) => {
    setMapping((m) => {
      if (!column) {
        const { [key]: _drop, ...rest } = m;
        return rest;
      }
      return { ...m, [key]: column };
    });
  };

  const importNow = useCallback(async () => {
    setError(null);
    if (!mapping.name) {
      setError("Pick which column has the customer name. That's the only required field.");
      return;
    }
    setStage("importing");
    setBusy(true);
    try {
      const r = await fetch("/api/sources/csv/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, mapping, filename }),
      });
      const body = (await r.json()) as ImportResult;
      setResult(body);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStage("map");
    } finally {
      setBusy(false);
    }
  }, [csv, filename, mapping]);

  if (stage === "pick") {
    return (
      <div>
        <div
          className="cursor-pointer rounded-[16px] border-2 border-dashed border-whisper-gray bg-canvas-ice px-6 py-10 text-center transition-colors hover:border-outline-blue hover:bg-ghost-blue"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
        >
          <p className="text-[15px] text-ink">Click to choose or drag a .csv here</p>
          <p className="mt-1 text-[12px] text-slate">Up to 4 MB. Your spreadsheet should have a header row.</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        {busy && <p className="mt-4 text-[13px] text-slate">Reading file…</p>}
        {error && <p className="mt-4 text-[13px] text-accent-orange">{error}</p>}
      </div>
    );
  }

  if (stage === "map" && preview) {
    return (
      <div>
        <h3 className="text-[16px] font-semibold text-ink">Map columns</h3>
        <p className="mt-1 text-[13px] text-slate">
          <strong className="font-semibold">{filename}</strong> — {preview.rowCount} rows,{" "}
          {preview.columns.length} columns. We&apos;ve guessed below; adjust if needed.
        </p>

        <div className="mt-5 space-y-3">
          {FIELDS.map((f) => (
            <div
              key={f.key}
              className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[140px_1fr] sm:gap-4"
            >
              <label className="text-[13px] text-ink">
                {f.label}
                {f.required && <span className="ml-1 text-accent-orange">*</span>}
              </label>
              <div>
                <select
                  value={mapping[f.key] ?? ""}
                  onChange={(e) => setMap(f.key, e.target.value)}
                  className="block w-full rounded-[10px] border border-whisper-gray bg-canvas-ice px-3 py-2 text-[14px] text-ink outline-none focus:border-outline-blue"
                >
                  <option value="">— don&apos;t import —</option>
                  {preview.columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {f.hint && <p className="mt-1 text-[12px] text-slate">{f.hint}</p>}
              </div>
            </div>
          ))}
        </div>

        <h4 className="mt-7 text-[14px] font-semibold text-ink">Preview (first 5 rows)</h4>
        <div className="mt-2 overflow-x-auto rounded-[12px] border border-whisper-gray/50 bg-canvas-ice">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-whisper-gray/40">
                {preview.columns.map((c) => (
                  <th
                    key={c}
                    className="px-3 py-2 text-[11px] uppercase tracking-[1px] text-slate"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.sampleRows.map((r, i) => (
                <tr key={i} className="border-b border-whisper-gray/20 last:border-0">
                  {preview.columns.map((c) => (
                    <td key={c} className="px-3 py-2 text-[13px] text-ink/85">
                      {r[c] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="mt-4 text-[13px] text-accent-orange">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Pill onClick={importNow} disabled={busy} size="lg">
            {busy ? "Importing…" : `Import ${preview.rowCount} rows`}
          </Pill>
          <Ghost onClick={reset}>Choose a different file</Ghost>
        </div>
      </div>
    );
  }

  if (stage === "importing") {
    return (
      <div>
        <h3 className="text-[16px] font-semibold text-ink">Writing rows…</h3>
        <p className="mt-2 text-[13px] text-slate">About a second per 100 rows.</p>
      </div>
    );
  }

  if (stage === "done" && result) {
    return (
      <div>
        <h3 className="text-[18px] font-semibold text-ink">
          {result.ok ? "Import complete." : "Import finished with some errors."}
        </h3>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-[12px] bg-task-card-mint px-4 py-3">
            <p className="text-[11px] uppercase tracking-[1px] text-ink/65">Added</p>
            <p className="mt-1 text-[24px] font-semibold text-ink">{result.inserted}</p>
          </div>
          <div className="rounded-[12px] bg-ghost-blue px-4 py-3">
            <p className="text-[11px] uppercase tracking-[1px] text-outline-blue">Updated</p>
            <p className="mt-1 text-[24px] font-semibold text-ink">{result.updated}</p>
          </div>
          <div className="rounded-[12px] bg-task-card-yellow px-4 py-3">
            <p className="text-[11px] uppercase tracking-[1px] text-ink/65">Skipped</p>
            <p className="mt-1 text-[24px] font-semibold text-ink">{result.skipped}</p>
          </div>
        </div>
        {result.errors.length > 0 && (
          <ul className="mt-4 space-y-1 text-[12px] text-ink/75">
            {result.errors.slice(0, 6).map((e, i) => (
              <li key={i}>• {e}</li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Pill onClick={() => router.push("/dashboard/data")} size="lg">
            See the imported people
          </Pill>
          <Ghost onClick={reset}>Upload another file</Ghost>
        </div>
      </div>
    );
  }

  return null;
}
