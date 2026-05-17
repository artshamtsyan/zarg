// MarkdownV2 escaping. Telegram requires these characters to be escaped
// outside of code blocks: _ * [ ] ( ) ~ ` > # + - = | { } . !
//
// See: https://core.telegram.org/bots/api#markdownv2-style

const MD2_SPECIALS = /[_*\[\]()~`>#+\-=|{}.!\\]/g;

/** Escape a plain-text string so it's safe to drop into MarkdownV2. */
export function escapeMd2(text: string): string {
  return text.replace(MD2_SPECIALS, (m) => `\\${m}`);
}

/**
 * The briefing generator emits a narrow markdown subset:
 *   **bold heading**
 *   - bullets
 *   1. numbered
 *   plain paragraphs
 *
 * Convert that subset into MarkdownV2 with proper escaping. Markdown
 * structural characters (* for bold, the dash/digit prefixes for lists)
 * are left intact; everything else gets escaped.
 */
export function briefingToMd2(markdown: string): string {
  const out: string[] = [];
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.replace(/[   ]/g, " ").trimEnd();

    // Heading-like: **Heading**
    const headingMatch = line.match(/^\s*\*\*(.+?)\*\*\s*$/);
    if (headingMatch) {
      out.push(`*${escapeMd2(headingMatch[1])}*`);
      continue;
    }

    // Bullet
    const bulletMatch = line.match(/^\s*([•\-])\s+(.+)$/);
    if (bulletMatch) {
      out.push(`• ${formatInline(bulletMatch[2])}`);
      continue;
    }

    // Numbered
    const numberedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      out.push(`${escapeMd2(numberedMatch[1] + ".")} ${formatInline(numberedMatch[2])}`);
      continue;
    }

    if (line.trim() === "") {
      out.push("");
      continue;
    }

    out.push(formatInline(line));
  }
  return out.join("\n");
}

// Handle inline **bold** within an otherwise plain line.
function formatInline(s: string): string {
  const parts: string[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(escapeMd2(s.slice(last, m.index)));
    parts.push(`*${escapeMd2(m[1])}*`);
    last = re.lastIndex;
  }
  if (last < s.length) parts.push(escapeMd2(s.slice(last)));
  return parts.join("");
}
