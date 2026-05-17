import { cn } from "@/lib/utils";

/**
 * Renders the briefing markdown body with the Dimension type system.
 * Supports the limited markdown subset the generator emits:
 *   - **Heading**
 *   - • bullet
 *   - 1. numbered
 *   - paragraphs separated by blank lines
 */
export function BriefingBody({ markdown, className }: { markdown: string; className?: string }) {
  const lines = markdown.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;

  const inlineFormat = (text: string, key: string | number) => {
    // Bold via **...** → <strong>
    const parts: React.ReactNode[] = [];
    let last = 0;
    const re = /\*\*(.+?)\*\*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      parts.push(
        <strong key={`b-${key}-${m.index}`} className="font-geist text-canvas-white">
          {m[1]}
        </strong>
      );
      last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length === 0 ? text : parts;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    // Heading-like line: **Heading**
    const headingMatch = line.match(/^\s*\*\*(.+?)\*\*\s*$/);
    if (headingMatch) {
      out.push(
        <p
          key={`h-${i}`}
          className="font-dm-sans mt-4 text-[12px] uppercase tracking-[1.8px] text-ash-text first:mt-0"
        >
          {headingMatch[1]}
        </p>
      );
      i++;
      continue;
    }
    // Bullet list
    if (/^\s*[•\-]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[•\-]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[•\-]\s/, "").trim());
        i++;
      }
      out.push(
        <ul key={`u-${i}`} className="mt-1 space-y-1.5">
          {items.map((it, idx) => (
            <li key={idx} className="flex gap-2 font-dm-sans text-[15px] leading-[1.5] tracking-[0.35px] text-ghost-white">
              <span className="text-slate-text">•</span>
              <span>{inlineFormat(it, idx)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    // Numbered list
    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s/, "").trim());
        i++;
      }
      out.push(
        <ol key={`o-${i}`} className="mt-1 space-y-1.5">
          {items.map((it, idx) => (
            <li key={idx} className="flex gap-3 font-dm-sans text-[15px] leading-[1.5] tracking-[0.35px] text-ghost-white">
              <span className="font-geist text-ash-text">{idx + 1}.</span>
              <span>{inlineFormat(it, idx)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }
    // Default paragraph
    out.push(
      <p
        key={`p-${i}`}
        className="mt-3 font-dm-sans text-[15px] leading-[1.5] tracking-[0.35px] text-ghost-white first:mt-0"
      >
        {inlineFormat(line, i)}
      </p>
    );
    i++;
  }

  return <div className={cn("space-y-1", className)}>{out}</div>;
}
