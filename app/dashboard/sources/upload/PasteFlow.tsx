"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/ui/Pill";
import { Ghost } from "@/components/ui/Ghost";

interface ExtractedPerson {
  name: string;
  phone?: string | null;
  status?: "new" | "trial" | "active" | "paused";
  segment?: string | null;
  notes?: string | null;
}

interface ImportResult {
  ok: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

type Stage = "input" | "review" | "saving" | "done";

const EXAMPLE = `Maria — Wed 7pm regular, +374 91 555 111
Anush, beginner, joined April
Lilit (kid's mom) drop-in only
Diana 374 93 555 444 — trial last week, follow up
Karen books month at a time, never misses Saturdays`;

export function PasteFlow() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [people, setPeople] = useState<ExtractedPerson[]>([]);
  const [stage, setStage] = useState<Stage>("input");
  const [source, setSource] = useState<"llm" | "fallback">("llm");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setStage("input");
    setText("");
    setPeople([]);
    setError(null);
    setResult(null);
  };

  const extract = useCallback(async () => {
    if (!text.trim()) {
      setError("Type or paste something first.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/sources/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = await r.json();
      if (!body.ok) {
        setError(body.error ?? "Couldn't extract");
        return;
      }
      if (!body.people || body.people.length === 0) {
        setError("I couldn't find any people in that text. Try a clearer list — one name per line works best.");
        return;
      }
      setPeople(body.people);
      setSource(body.source);
      setStage("review");
    } finally {
      setBusy(false);
    }
  }, [text]);

  const updateRow = (i: number, patch: Partial<ExtractedPerson>) => {
    setPeople((arr) => arr.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };
  const removeRow = (i: number) => setPeople((arr) => arr.filter((_, idx) => idx !== i));

  const commit = useCallback(async () => {
    setError(null);
    if (people.length === 0) {
      setError("Nothing to import.");
      return;
    }
    setStage("saving");
    setBusy(true);
    try {
      const r = await fetch("/api/sources/extract?commit=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ people }),
      });
      const body = (await r.json()) as ImportResult;
      setResult(body);
      setStage("done");
    } finally {
      setBusy(false);
    }
  }, [people]);

  if (stage === "input") {
    return (
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={`Paste anything: names one per line, a WhatsApp chat, your notes…\n\n${EXAMPLE}`}
          className="block w-full rounded-[12px] border border-whisper-gray bg-canvas-ice px-4 py-3 font-mono text-[13px] leading-[1.55] text-ink outline-none focus:border-outline-blue"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate">
          <span>{text.length.toLocaleString()} chars (max 12,000)</span>
          <button
            type="button"
            onClick={() => setText(EXAMPLE)}
            className="text-outline-blue underline underline-offset-2"
          >
            Try with the example
          </button>
        </div>
        {error && <p className="mt-3 text-[13px] text-accent-orange">{error}</p>}
        <div className="mt-5 flex gap-2.5">
          <Pill onClick={extract} disabled={busy || !text.trim()} size="lg">
            {busy ? "Reading…" : "Extract people"}
          </Pill>
        </div>
      </div>
    );
  }

  if (stage === "review") {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[16px] font-semibold text-ink">
            Found {people.length} {people.length === 1 ? "person" : "people"}
          </h3>
          <span className="text-[11px] uppercase tracking-[1.2px] text-slate">
            {source === "llm" ? "AI-extracted" : "Line-parsed"}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-slate">
          Edit anything before importing. Duplicates by name will update the existing row.
        </p>
        <div className="mt-4 space-y-2">
          {people.map((p, i) => (
            <div
              key={i}
              className="grid grid-cols-1 items-start gap-2 rounded-[12px] border border-whisper-gray/40 bg-canvas-ice p-3 sm:grid-cols-[1.2fr_1fr_0.7fr_1.5fr_auto]"
            >
              <input
                value={p.name}
                onChange={(e) => updateRow(i, { name: e.target.value })}
                placeholder="Name"
                className="rounded-[8px] border border-whisper-gray/60 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-outline-blue"
              />
              <input
                value={p.phone ?? ""}
                onChange={(e) => updateRow(i, { phone: e.target.value })}
                placeholder="Phone"
                className="rounded-[8px] border border-whisper-gray/60 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-outline-blue"
              />
              <select
                value={p.status ?? "active"}
                onChange={(e) => updateRow(i, { status: e.target.value as ExtractedPerson["status"] })}
                className="rounded-[8px] border border-whisper-gray/60 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-outline-blue"
              >
                <option value="active">active</option>
                <option value="new">new</option>
                <option value="trial">trial</option>
                <option value="paused">paused</option>
              </select>
              <input
                value={p.notes ?? ""}
                onChange={(e) => updateRow(i, { notes: e.target.value })}
                placeholder="Notes"
                className="rounded-[8px] border border-whisper-gray/60 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-outline-blue"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="self-center rounded-[8px] px-2 py-1 text-[12px] text-slate hover:text-accent-orange"
                aria-label="Remove this row"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {error && <p className="mt-4 text-[13px] text-accent-orange">{error}</p>}
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Pill onClick={commit} disabled={busy || people.length === 0} size="lg">
            {busy ? "Importing…" : `Import ${people.length}`}
          </Pill>
          <Ghost onClick={reset}>Start over</Ghost>
        </div>
      </div>
    );
  }

  if (stage === "saving") {
    return (
      <div>
        <h3 className="text-[16px] font-semibold text-ink">Writing rows…</h3>
        <p className="mt-2 text-[13px] text-slate">
          About a second per 100 rows.
        </p>
      </div>
    );
  }

  if (stage === "done" && result) {
    return (
      <div>
        <h3 className="text-[18px] font-semibold text-ink">
          {result.ok ? "Done." : "Imported with some errors."}
        </h3>
        <div className="mt-4 grid grid-cols-3 gap-3">
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
            {result.errors.slice(0, 6).map((e, idx) => (
              <li key={idx}>• {e}</li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Pill onClick={() => router.push("/dashboard/data")} size="lg">
            See the imported people
          </Pill>
          <Ghost onClick={reset}>Add more</Ghost>
        </div>
      </div>
    );
  }

  return null;
}
