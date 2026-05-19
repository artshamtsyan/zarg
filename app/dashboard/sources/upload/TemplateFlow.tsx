"use client";

import { PillLink } from "@/components/ui/Pill";
import { Ghost } from "@/components/ui/Ghost";
import { useState } from "react";

const SAMPLE_ROWS = [
  ["Maria Sargsyan", "+374 91 555 111", "Wed 7pm regular — on monthly subscription"],
  ["Anush Petrosyan", "+374 93 555 222", "Beginner — joined April"],
  ["Lilit Khachaturyan", "+374 77 555 333", "Drop-in only — prefers Saturday classes"],
  ["Diana Mkrtchyan", "+374 91 555 444", "Trial last week — follow up on renewal"],
  ["Karen Avetisyan", "+374 93 555 555", "Books a month at a time — never misses"],
];

export function TemplateFlow() {
  const [copied, setCopied] = useState(false);

  const copyText = async () => {
    const text =
      "Name,Phone,Notes\n" +
      SAMPLE_ROWS.map((r) => r.map((c) => (c.includes(",") ? `"${c}"` : c)).join(",")).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <p className="text-[14px] leading-[1.55] text-ink/85">
        Three columns. Only the first is required — fill in what you have, leave the rest blank,
        upload back as a CSV when you&apos;re done.
      </p>

      <div className="mt-5 overflow-x-auto rounded-[12px] border border-whisper-gray/50 bg-canvas-ice">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-whisper-gray/40">
              {["Name", "Phone", "Notes"].map((c) => (
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
            {SAMPLE_ROWS.map((row, i) => (
              <tr key={i} className="border-b border-whisper-gray/20 last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-[13px] text-ink/85">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <PillLink href="/starup-customers-template.csv" external size="lg">
          Download CSV template
        </PillLink>
        <Ghost onClick={copyText}>{copied ? "Copied ✓" : "Or copy as text"}</Ghost>
      </div>

      <p className="mt-4 text-[12px] text-slate">
        Tip: open the file in Numbers / Excel / Google Sheets, fill it in, save as CSV, then upload
        it under the <strong>Upload CSV</strong> tab above.
      </p>
    </div>
  );
}
