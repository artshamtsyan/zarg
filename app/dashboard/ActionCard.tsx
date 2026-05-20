"use client";

import Link from "next/link";
import { useState } from "react";

interface ActionCardProps {
  index: number;
  text: string;
}

export function ActionCard({ index, text }: ActionCardProps) {
  const [done, setDone] = useState(false);
  const tellLink = `/dashboard/learn?prefill=${encodeURIComponent(`Just did: ${text}`)}`;

  return (
    <div
      className={[
        "rounded-[20px] p-5 transition-colors",
        done
          ? "bg-task-card-mint/60 border border-accent-teal/40"
          : "bg-canvas-ice border border-whisper-gray/40",
      ].join(" ")}
    >
      <div className="flex gap-3">
        <span
          className={[
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
            done
              ? "bg-accent-teal text-canvas-ice"
              : "bg-outline-blue text-canvas-ice",
          ].join(" ")}
        >
          {done ? "✓" : index + 1}
        </span>
        <p
          className={[
            "text-[15px] leading-[1.5]",
            done ? "text-ink/70 line-through decoration-ink/40" : "text-ink",
          ].join(" ")}
        >
          {text}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 pl-9">
        <button
          type="button"
          onClick={() => setDone((d) => !d)}
          className="rounded-full border border-outline-blue bg-ghost-blue px-3 py-1 text-[12px] font-medium text-outline-blue transition-colors hover:bg-[#cce7fb]"
        >
          {done ? "Mark not done" : "Mark done"}
        </button>
        <Link
          href={tellLink}
          className="rounded-full bg-transparent px-3 py-1 text-[12px] font-medium text-slate hover:text-ink"
        >
          Tell StarUp how it went →
        </Link>
      </div>
    </div>
  );
}
