import { getAnthropic } from "./anthropic";
import { env } from "@/lib/env";
import { assertWithinBudget, recordUsage } from "./cost-guard";
import type { BriefingSnapshot } from "@/lib/db/snapshot";

const BRIEFING_SYSTEM_DAILY = `You are StarUp writing a small-business owner's daily operations briefing. The owner reads this on Telegram first thing in the morning.

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

const BRIEFING_SYSTEM_SUNDAY = `You are StarUp writing a small-business owner's Sunday weekly recap. The owner reads this on Telegram on Sunday evening — a retrospective, not the daily ops view.

Format strictly:
Good evening, {owner_name}. Here's the week.

**Week in numbers**
• Revenue this week: {amount} ({comparison to last 7 days if data allows})
• Attendance: {attended} of {booked} ({rate})
• New leads this week: {N}

**Highlights**
• {1–3 plain observations about who showed up, what worked}

**Watch-outs**
• {1–3 short risks: packages expiring next week, pending payments, no-show trend}

**Three priorities for the week ahead**
1. {strategic, weekly-scope action — not just one client}
2. {action}
3. {action}

Rules:
- Use the entity vocabulary from the profile.
- Be retrospective in tone — past tense for the week behind, future tense for the week ahead.
- Priorities should be week-shaped (renew a cohort of subscriptions, run a referral push) not day-shaped (send a single reminder).
- Keep the whole recap under 300 words.
- No preamble. Plain bullets with "•". Numbered list for priorities.`;

interface BuildArgs {
  snapshot: BriefingSnapshot;
  profile: {
    entities?: unknown;
    goals?: unknown;
  };
  yesterdayBriefingBody?: string | null;
  tenantId?: string;
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

function isSundayInTenantTz(t: BriefingSnapshot): boolean {
  return t.today.weekday === "Sunday";
}

export interface GeneratedBriefing {
  body: string;
  suggestedActions: string[];
}

/**
 * Extract the numbered items under the "Suggested actions" heading from
 * the briefing markdown. The prompt always emits this shape — we parse it
 * out so we can render each action as a tappable Telegram chip.
 */
export function extractSuggestedActions(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let inSection = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^\*\*Suggested actions\*\*/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      // Stop when we hit the next bold heading or a different bullet shape
      if (/^\*\*/.test(line) && !/^\*\*Suggested/i.test(line)) break;
      const m = line.match(/^\d+\.\s+(.+)$/);
      if (m) {
        out.push(m[1].trim());
        if (out.length >= 3) break;
        continue;
      }
      // Allow blank lines inside the section
      if (line === "") continue;
      // Anything else means we've left the list
      if (out.length > 0) break;
    }
  }
  return out;
}

export async function generateBriefing(args: BuildArgs): Promise<GeneratedBriefing> {
  const body = await generateBriefingBody(args);
  return { body, suggestedActions: extractSuggestedActions(body) };
}

export async function generateBriefingBody(args: BuildArgs): Promise<string> {
  if (!env.hasAnthropic()) {
    return stubBriefing(args.snapshot);
  }
  if (args.tenantId) {
    await assertWithinBudget(args.tenantId);
  }
  const sunday = isSundayInTenantTz(args.snapshot);
  const system = sunday ? BRIEFING_SYSTEM_SUNDAY : BRIEFING_SYSTEM_DAILY;
  const client = getAnthropic();
  const model = env.briefingModel();
  const res = await client.messages.create({
    model,
    max_tokens: sunday ? 1100 : 800,
    system,
    messages: [{ role: "user", content: buildUserPrompt(args) }],
  });
  if (args.tenantId) {
    await recordUsage({
      tenantId: args.tenantId,
      kind: "briefing",
      model,
      tokensIn: res.usage?.input_tokens ?? 0,
      tokensOut: res.usage?.output_tokens ?? 0,
      metadata: { sunday },
    });
  }
  for (const block of res.content) {
    if (block.type === "text") return block.text;
  }
  return stubBriefing(args.snapshot);
}

function stubBriefing(t: BriefingSnapshot): string {
  return `Good morning, ${t.ownerName ?? "Owner"}.\n\n**Today** (${t.today.weekday}, ${t.today.date})\n• ${t.today.events.length} events scheduled\n\n**Money**\n• Yesterday's revenue: ${moneyDisplay(t.yesterday.revenueMinor, t.yesterday.currency)}\n• Pending payments: ${t.pendingPayments.count}\n\n**People**\n• ${t.newLeadsLast7Days} new leads this week\n• ${t.packagesExpiringSoon.length} packages expiring soon\n\n**Suggested actions**\n1. Configure ANTHROPIC_API_KEY for AI-written briefings.\n2. Review the dashboard for context.\n3. Reach out to recent leads.\n\n_(Demo mode — no Anthropic key set.)_`;
}
