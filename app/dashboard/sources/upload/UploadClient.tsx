"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PasteFlow } from "./PasteFlow";
import { CsvFlow } from "./CsvFlow";
import { TemplateFlow } from "./TemplateFlow";

type Tab = "paste" | "csv" | "template";

interface TabDef {
  key: Tab;
  label: string;
  blurb: string;
}

const TABS: TabDef[] = [
  {
    key: "paste",
    label: "Paste a list",
    blurb: "Type names, paste a WhatsApp chat, dump your notes — StarUp extracts.",
  },
  {
    key: "csv",
    label: "Upload CSV",
    blurb: "You already have a spreadsheet. We'll map the columns.",
  },
  {
    key: "template",
    label: "Use a template",
    blurb: "Don't have one yet? Download our 3-column template, fill it in, upload back.",
  },
];

export function UploadClient() {
  const [tab, setTab] = useState<Tab>("paste");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-canvas-ice p-1 ring-1 ring-whisper-gray/40">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
              tab === t.key
                ? "bg-ghost-blue text-outline-blue"
                : "text-slate hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-slate">{TABS.find((t) => t.key === tab)?.blurb}</p>

      <div className="mt-6">
        {tab === "paste" && <PasteFlow />}
        {tab === "csv" && <CsvFlow />}
        {tab === "template" && <TemplateFlow />}
      </div>
    </div>
  );
}
