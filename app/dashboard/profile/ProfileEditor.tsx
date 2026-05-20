"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskCard } from "@/components/ui/TaskCard";
import { Pill } from "@/components/ui/Pill";
import { Ghost } from "@/components/ui/Ghost";
import { updateProfilePlainText } from "@/lib/actions/profile";

export interface ProfileSlotProps {
  slot: string;
  label: string;
  tone: "pink" | "violet" | "mint" | "sky" | "yellow";
  description: string;
  placeholder: string;
  multi?: boolean;
  initial: string;
}

export function ProfileEditor({ slots }: { slots: ProfileSlotProps[] }) {
  return (
    <div className="mt-8 space-y-4">
      {slots.map((s) => (
        <ProfileSlot key={s.slot} {...s} />
      ))}
    </div>
  );
}

function ProfileSlot({ slot, label, tone, description, placeholder, multi, initial }: ProfileSlotProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const empty = initial.trim().length === 0;

  const save = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const r = await updateProfilePlainText(slot, draft);
      if (r.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(r.error ?? "Couldn't save");
      }
    });
  }, [slot, draft, router]);

  const cancel = () => {
    setDraft(initial);
    setError(null);
    setEditing(false);
  };

  return (
    <TaskCard tone={tone} className="p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-semibold text-ink">{label}</h3>
          <p className="mt-0.5 text-[12px] text-ink/65">{description}</p>
        </div>
        {!editing && <Ghost onClick={() => setEditing(true)}>{empty ? "Add" : "Edit"}</Ghost>}
      </div>

      {editing ? (
        <div className="mt-4">
          {multi ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={Math.max(4, Math.min(14, draft.split("\n").length + 1))}
              placeholder={placeholder}
              className="block w-full rounded-[10px] border border-whisper-gray bg-canvas-ice px-3 py-2.5 text-[14px] leading-[1.5] text-ink outline-none focus:border-outline-blue"
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              maxLength={80}
              className="block w-full rounded-[10px] border border-whisper-gray bg-canvas-ice px-3 py-2.5 text-[15px] text-ink outline-none focus:border-outline-blue"
            />
          )}
          {multi && (
            <p className="mt-1 text-[11px] text-ink/55">
              One per line. Dashes (-) and bullets (•) are stripped.
            </p>
          )}
          {error && <p className="mt-2 text-[13px] text-accent-orange">{error}</p>}
          <div className="mt-3 flex items-center gap-2.5">
            <Pill onClick={save} disabled={pending || draft === initial}>
              {pending ? "Saving…" : "Save"}
            </Pill>
            <Ghost onClick={cancel} disabled={pending}>
              Cancel
            </Ghost>
          </div>
        </div>
      ) : empty ? (
        <p className="mt-3 text-[14px] italic text-ink/60">
          Not set yet. Tap <strong>Add</strong> to fill this in.
        </p>
      ) : multi ? (
        <ul className="mt-3 space-y-1.5">
          {initial.split("\n").map((line, i) => (
            <li
              key={i}
              className="flex gap-2 text-[15px] leading-[1.5] text-ink"
            >
              <span className="text-ink/40">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[15px] leading-[1.5] text-ink">{initial}</p>
      )}
    </TaskCard>
  );
}
