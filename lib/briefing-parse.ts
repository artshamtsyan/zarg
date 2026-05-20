// Parse the briefing markdown body into structured sections so the dashboard
// can render each as its own visual block instead of a wall of text.
//
// The generator emits a known shape:
//   Good morning, {name}.
//   **Today** ({date}) ... \n• line \n• line
//   **Money** ... \n• line
//   **People** ... \n• line
//   **Suggested actions** \n1. text \n2. text \n3. text
//   **Heads-up** \n• line
//
// Parser is forgiving — it tolerates missing sections, mid-section paragraphs,
// and minor markdown drift.

export interface BriefingSections {
  greeting: string | null;
  today: {
    heading: string | null;
    bullets: string[];
  };
  money: { bullets: string[] };
  people: { bullets: string[] };
  actions: string[];
  headsUp: string[];
  extras: Array<{ heading: string; bullets: string[] }>;
}

const HEADING_RE = /^\s*\*\*(.+?)\*\*(.*)$/;
const BULLET_RE = /^\s*[•\-]\s+(.+?)\s*$/;
const NUMBERED_RE = /^\s*\d+[\.)]\s+(.+?)\s*$/;
const GREETING_RE = /^(Good\s+(?:morning|evening|afternoon)|Hi|Hello|Hey)[\s,].*$/i;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

export function parseBriefing(markdown: string): BriefingSections {
  const out: BriefingSections = {
    greeting: null,
    today: { heading: null, bullets: [] },
    money: { bullets: [] },
    people: { bullets: [] },
    actions: [],
    headsUp: [],
    extras: [],
  };

  if (!markdown) return out;

  type Section = "today" | "money" | "people" | "actions" | "headsUp" | "extras";
  let current: Section | null = null;
  let currentExtraHeading = "";

  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (line === "") continue;

    // Greeting — capture the very first line if it matches
    if (!out.greeting && GREETING_RE.test(line)) {
      out.greeting = line.replace(/\*\*/g, "");
      continue;
    }

    // Section heading
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      const headingText = headingMatch[1].trim();
      const trailing = headingMatch[2]?.trim();
      const norm = normalize(headingText);
      if (norm.startsWith("today")) {
        current = "today";
        out.today.heading = trailing && trailing.length > 0 ? trailing : headingText;
      } else if (norm.startsWith("money") || norm.includes("revenue")) {
        current = "money";
      } else if (norm === "people" || norm.includes("lead") || norm.includes("package")) {
        current = "people";
      } else if (norm.startsWith("suggested") || norm.includes("action") || norm.includes("priorit")) {
        current = "actions";
      } else if (norm.includes("headsup") || norm.includes("watch") || norm.includes("riskahead")) {
        current = "headsUp";
      } else {
        current = "extras";
        currentExtraHeading = headingText;
        out.extras.push({ heading: headingText, bullets: [] });
      }
      continue;
    }

    // Bullet or numbered line
    const bullet = line.match(BULLET_RE);
    const numbered = line.match(NUMBERED_RE);
    const content = bullet?.[1] ?? numbered?.[1] ?? null;

    if (current === "today" && content) {
      out.today.bullets.push(content);
    } else if (current === "money" && content) {
      out.money.bullets.push(content);
    } else if (current === "people" && content) {
      out.people.bullets.push(content);
    } else if (current === "actions") {
      // Both numbered AND bullet lines count as actions
      if (content) out.actions.push(content);
    } else if (current === "headsUp" && content) {
      out.headsUp.push(content);
    } else if (current === "extras" && content) {
      const last = out.extras[out.extras.length - 1];
      if (last) last.bullets.push(content);
    } else if (current && content) {
      // Loose paragraph under a known section
      if (current === "today") out.today.bullets.push(content);
      else if (current === "money") out.money.bullets.push(content);
    }
  }

  return out;
}
