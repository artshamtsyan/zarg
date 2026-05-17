import { getAnthropic } from "./anthropic";
import { env } from "@/lib/env";
import type { BriefingSnapshot } from "@/lib/db/snapshot";

const BRIEFING_SYSTEM = `You are Zarg writing a small-business owner's daily operations briefing. The owner reads this on Telegram first thing in the morning.

Format strictly:
Good morning, {owner_name}.

**Today** ({weekday}, {date})
• {summary of today's events: count, times, staff, booked / capacity}
• {summary of bookings: who's expected, capacity open}

**Money**
• Yesterday's revenue: {amount}
• Pending payments: {count} ({total}) if any
• Last 7 days: {total}

**People**
• {N} new leads this week
• Packages expiring this week: {names with days left}

**Suggested actions**
1. {action tied to a goal, grounded in the data}
2. {action}
3. {action}

**Heads-up**
• {anomaly or risk; one line. Omit this section if nothing notable.}

Rules:
- Use the entity vocabulary from the profile (call them "classes" or "appointments" or "sessions" depending on what the tenant said).
- Suggested actions must be SPECIFIC, name names where possible, and tie to the owner's stated goals.
- If the data shows zero of something, say so plainly — don't invent content.
- Keep the whole briefing under 250 words.
- No preamble, no markdown beyond what's shown above. No code blocks. Plain bullets with "•".
- Money values: format with the currency code (e.g. "38,000 AMD"), no commas inside the amount if the locale doesn't use them.`;

interface BuildArgs {
  snapshot: BriefingSnapshot;
  profile: {
    entities?: unknown;
    goals?: unknown;
  };
  yesterdayBriefingBody?: string | null;
}

function moneyDisplay(minor: number, currency: string): string {
  return `${(minor / 100).toLocaleString("en-US")} ${currency}`;
}

function buildUserPrompt({ snapshot, profile, yesterdayBriefingBody }: BuildArgs): string {
  const t = snapshot;
  const lines: string[] = [];
  lines.push(`Owner: ${t.ownerName ?? "Owner"}`);
  lines.push(`Business: ${t.tenant.name} (${t.tenant.domain})`);
  lines.push(`Entity vocabulary: ${JSON.stringify(profile.entities ?? {})}`);
  lines.push(`Stated goals: ${JSON.stringify(profile.goals ?? [])}`);
  lines.push("");
  lines.push(`Date: ${t.today.weekday}, ${t.today.date} (${t.tenant.timezone})`);
  lines.push("");
  lines.push(`TODAY (${t.today.events.length} events):`);
  for (const e of t.today.events) {
    lines.push(`  • ${e.timeLocal} ${e.type ?? "event"} w/ ${e.staff ?? "—"} — ${e.bookedCount}/${e.capacity}`);
  }
  if (t.today.events.length === 0) lines.push("  (no events today)");
  lines.push("");
  lines.push(`YESTERDAY: ${t.yesterday.completedEvents} events completed, ${t.yesterday.attendedCount} attended, ${t.yesterday.noShowCount} no-shows.`);
  lines.push(`Yesterday revenue: ${moneyDisplay(t.yesterday.revenueMinor, t.yesterday.currency)}`);
  lines.push(`Last 7 days revenue: ${moneyDisplay(t.week.revenueLast7DaysMinor, t.week.currency)}`);
  lines.push(`Pending payments: ${t.pendingPayments.count} (${moneyDisplay(t.pendingPayments.totalMinor, t.pendingPayments.currency)})`);
  lines.push("");
  lines.push(`UPCOMING THIS WEEK: ${t.week.upcomingEventCount} total`);
  for (const d of t.week.upcomingByWeekday) {
    lines.push(`  · ${d.weekday}: ${d.count}`);
  }
  lines.push("");
  lines.push(`New leads in last 7 days: ${t.newLeadsLast7Days}`);
  lines.push(`Packages expiring this week (${t.packagesExpiringSoon.length}):`);
  for (const p of t.packagesExpiringSoon.slice(0, 8)) {
    lines.push(`  • ${p.personName} — ${p.visitsRemaining} left, expires ${p.expiresAt}`);
  }
  if (yesterdayBriefingBody) {
    lines.push("");
    lines.push("Yesterday's briefing (for continuity, optional reference):");
    lines.push(yesterdayBriefingBody.slice(0, 1200));
  }
  return lines.join("\n");
}

export async function generateBriefingBody(args: BuildArgs): Promise<string> {
  if (!env.hasAnthropic()) {
    return stubBriefing(args.snapshot);
  }
  const client = getAnthropic();
  const res = await client.messages.create({
    model: env.briefingModel(),
    max_tokens: 800,
    system: BRIEFING_SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(args) }],
  });
  for (const block of res.content) {
    if (block.type === "text") return block.text;
  }
  return stubBriefing(args.snapshot);
}

function stubBriefing(t: BriefingSnapshot): string {
  return `Good morning, ${t.ownerName ?? "Owner"}.\n\n**Today** (${t.today.weekday}, ${t.today.date})\n• ${t.today.events.length} events scheduled\n\n**Money**\n• Yesterday's revenue: ${moneyDisplay(t.yesterday.revenueMinor, t.yesterday.currency)}\n• Pending payments: ${t.pendingPayments.count}\n\n**People**\n• ${t.newLeadsLast7Days} new leads this week\n• ${t.packagesExpiringSoon.length} packages expiring soon\n\n**Suggested actions**\n1. Configure ANTHROPIC_API_KEY for AI-written briefings.\n2. Review the dashboard for context.\n3. Reach out to recent leads.\n\n_(Demo mode — no Anthropic key set.)_`;
}
