"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskCard } from "@/components/ui/TaskCard";
import { Pill } from "@/components/ui/Pill";
import { Ghost } from "@/components/ui/Ghost";
import { updateProfileField } from "@/lib/actions/profile";

interface ProfileFields {
  currentState: unknown;
  goals: unknown;
  kpis: unknown;
  entities: unknown;
  keyWorkflows: unknown;
  proposedFlow: unknown;
  mvpScope: unknown;
  risks: unknown;
}

const FIELDS: Array<{
  key: keyof ProfileFields;
  label: string;
  tone: "pink" | "violet" | "mint" | "sky" | "yellow";
  description: string;
}> = [
  { key: "currentState", label: "Current state", tone: "violet", description: "Snapshot of how the business runs today." },
  { key: "goals", label: "Goals", tone: "pink", description: "What the owner is optimizing for." },
  { key: "entities", label: "Entity vocabulary", tone: "mint", description: "What you call clients, classes, sessions." },
  { key: "kpis", label: "KPIs", tone: "yellow", description: "Numbers worth tracking each week." },
  { key: "keyWorkflows", label: "Key workflows", tone: "sky", description: "Repeatable manual processes." },
  { key: "proposedFlow", label: "Proposed flow / assessment", tone: "pink", description: "Discovery's automation recommendation." },
  { key: "mvpScope", label: "MVP scope", tone: "mint", description: "What to build first to prove value." },
  { key: "risks", label: "Risks", tone: "yellow", description: "Things that could go wrong." },
];

export function ProfileEditor({ initial }: { initial: ProfileFields }) {
  return (
    <div className="mt-8 space-y-4">
      {FIELDS.map((f) => (
        <FieldEditor key={f.key} field={f.key} label={f.label} tone={f.tone} description={f.description} value={initial[f.key]} />
      ))}
    </div>
  );
}

function FieldEditor({
  field,
  label,
  tone,
  description,
  value,
}: {
  field: keyof ProfileFields;
  label: string;
  tone: "pink" | "violet" | "mint" | "sky" | "yellow";
  description: string;
  value: unknown;
}) {
  const router = useRouter();
  const initialText = pretty(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const empty = isEmpty(value);

  const save = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const r = await updateProfileField(field, draft);
      if (r.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(r.error ?? "Couldn't save");
      }
    });
  }, [field, draft, router]);

  const cancel = useCallback(() => {
    setDraft(initialText);
    setError(null);
    setEditing(false);
  }, [initialText]);

  return (
    <TaskCard tone={tone} className="p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-semibold text-ink">{label}</h3>
          <p className="mt-0.5 text-[12px] text-ink/65">{description}</p>
        </div>
        {!editing && (
          <Ghost onClick={() => setEditing(true)}>{empty ? "Add" : "Edit"}</Ghost>
        )}
      </div>

      {editing ? (
        <div className="mt-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(6, Math.min(20, draft.split("\n").length + 1))}
            className="block w-full rounded-[10px] border border-whisper-gray bg-canvas-ice px-3 py-2.5 font-mono text-[13px] leading-[1.5] text-ink outline-none focus:border-outline-blue"
          />
          {error && <p className="mt-2 text-[13px] text-accent-orange">{error}</p>}
          <div className="mt-3 flex items-center gap-2.5">
            <Pill onClick={save} disabled={pending || draft === initialText}>
              {pending ? "Saving…" : "Save"}
            </Pill>
            <Ghost onClick={cancel} disabled={pending}>
              Cancel
            </Ghost>
          </div>
        </div>
      ) : (
        <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-[10px] bg-canvas-ice px-4 py-3 font-mono text-[13px] leading-[1.55] text-ink/85">
          {empty ? "—" : initialText}
        </pre>
      )}
    </TaskCard>
  );
}

function pretty(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}
