import Link from "next/link";
import { TaskCard } from "@/components/ui/TaskCard";
import { PillLink } from "@/components/ui/Pill";
import { GhostLink } from "@/components/ui/Ghost";

export const metadata = {
  title: "How Zarg works — concept & architecture",
  description:
    "A visual tour of the Zarg prototype: what it does, how it's built, and what's next.",
};

export default function ConceptPage() {
  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-[20px] font-semibold tracking-tight text-ink">
            Zarg
          </Link>
          <div className="flex items-center gap-2.5">
            <GhostLink href="/">Home</GhostLink>
            <PillLink href="/signup">Try the prototype</PillLink>
          </div>
        </header>

        {/* ─── HERO ──────────────────────────────────────────────── */}
        <section className="mt-20">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-outline-blue bg-ghost-blue px-3 py-1 text-[12px] text-outline-blue">
            Concept · Architecture · Roadmap
          </span>
          <h1 className="mt-5 text-[44px] font-semibold leading-[1.05] tracking-heading text-ink sm:text-[64px] sm:leading-[1.0] sm:tracking-display">
            How Zarg turns a 10-minute
            <br />
            chat into a daily ops briefing.
          </h1>
          <p className="mt-6 max-w-2xl text-[18px] leading-[1.5] text-slate">
            A multi-tenant agentic platform where any small-business owner signs up, talks to a
            discovery agent for ten minutes, and starts receiving a daily Telegram briefing the
            very next morning — written by Claude, grounded in their own data.
          </p>
        </section>

        {/* ─── ONE-BREATH SUMMARY (three pastel cards in a row) ──── */}
        <section className="mt-20">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">The prototype, in one breath</p>
          <h2 className="mt-3 text-[28px] font-semibold tracking-heading-sm text-ink sm:text-[32px]">
            Three things, every tenant.
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            <TaskCard tone="pink" className="p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-canvas-ice text-[20px] font-semibold text-ink">
                1
              </div>
              <h3 className="mt-5 text-[20px] font-semibold text-ink">Discovery as signup</h3>
              <p className="mt-3 text-[15px] leading-[1.55] text-ink/80">
                Claude Opus runs the Telegram Automation Discovery skill on the owner: 7–10 turns,
                quick-reply pills, structured tool calls. The conversation produces a complete
                operations profile — current state, goals, KPIs, entity vocabulary, key workflows,
                proposed flow, MVP scope, and risks.
              </p>
            </TaskCard>

            <TaskCard tone="violet" className="p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-canvas-ice text-[20px] font-semibold text-ink">
                2
              </div>
              <h3 className="mt-5 text-[20px] font-semibold text-ink">Self-learning, with a head start</h3>
              <p className="mt-3 text-[15px] leading-[1.55] text-ink/80">
                On finalize, Sonnet generates a coherent synthetic baseline so the dashboard isn't
                empty — 15–30 locale-appropriate clients, recurring classes across the past and
                next two weeks, bookings, payments, packages. From day one, owners type real
                events in plain language and Zarg writes real rows alongside — gradually replacing
                the baseline with the actual studio.
              </p>
            </TaskCard>

            <TaskCard tone="mint" className="p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-canvas-ice text-[20px] font-semibold text-ink">
                3
              </div>
              <h3 className="mt-5 text-[20px] font-semibold text-ink">A briefing that knows you</h3>
              <p className="mt-3 text-[15px] leading-[1.55] text-ink/80">
                Every morning Sonnet reads the tenant's data, the profile vocabulary, and yesterday's
                briefing for continuity — then writes today's: Today / Money / People / three goal-tied
                Suggested Actions / Heads-up. As real data crowds out the synthetic baseline, the
                briefing becomes literally about the owner's customers. ~$0.01–0.02 per tenant per day.
              </p>
            </TaskCard>
          </div>
        </section>

        {/* ─── HOW IT FLOWS (visual sequence) ────────────────────── */}
        <section className="mt-24">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">The flow</p>
          <h2 className="mt-3 text-[28px] font-semibold tracking-heading-sm text-ink sm:text-[32px]">
            From signup to morning briefing in under an hour.
          </h2>

          <div className="mt-10 space-y-3">
            <FlowStep
              tone="sky"
              tag="Step 1"
              title="Owner signs up"
              body="Email magic-link auth (Resend) — or in this demo, instant sign-in. Tenant row is created in Postgres with status='onboarding'."
              tech="Next.js · NextAuth v5 · Resend"
            />
            <FlowStep
              tone="pink"
              tag="Step 2"
              title="Welcome captures name + business + timezone"
              body="A 3-field form. Atomically creates the tenant, an empty business_profiles row, and stamps tenant_id onto the user."
              tech="Server Actions · Drizzle · Postgres"
            />
            <FlowStep
              tone="violet"
              tag="Step 3"
              title="Discovery chat with Claude Opus"
              body="Split layout: chat on the left, live business-profile panel on the right. Each turn streams text via SSE; tool calls (record_profile_field, propose_workflow, assess_automation) write to the DB before being forwarded to the client. The right panel lights up field by field."
              tech="Anthropic SDK · streaming SSE · cache_control"
            />
            <FlowStep
              tone="mint"
              tag="Step 4"
              title="Finalize seeds a synthetic head start"
              body="One Sonnet call with strict JSON output, validated by Zod and retried once, falls back to procedural Faker. All five tables (people/events/bookings/payments/packages) written in one transaction — every row marked `source = synthetic` so the platform can track what's baseline vs real."
              tech="Anthropic tool_choice · Zod · Drizzle transaction"
            />
            <FlowStep
              tone="yellow"
              tag="Step 5"
              title="Self-learning chat enriches in plain language"
              body="The owner types what's happening at /dashboard/learn ('Maria came tonight, paid 5000 cash'). Claude calls record_person / record_event / record_booking / record_payment, the server fuzzy-matches names, resolves natural-language times in the tenant's timezone, and writes real rows marked `source = owner_logged` next to the synthetic baseline."
              tech="Anthropic tools · date-fns-tz · Drizzle"
            />
            <FlowStep
              tone="sky"
              tag="Step 6"
              title="Daily briefing — preview now or wait for cron"
              body="The Generate Now button (or the daily 05:00 UTC cron) runs the aging job to slide the synthetic clock forward, queries a tenant-aware data snapshot, and calls Sonnet with a strict format prompt. Idempotent on (tenant_id, for_date). As real rows accumulate, the briefing becomes literally about the owner's customers."
              tech="Vercel Cron · date-fns-tz · Sonnet"
            />
            <FlowStep
              tone="pink"
              tag="Step 7"
              title="Telegram delivery — daily DM to the owner"
              body="One shared platform bot. Owners /start it with a one-time code from /dashboard/telegram; webhook ties their chat_id to their tenant. Daily cron sends the briefing as a MarkdownV2 message with inline buttons [Open dashboard] [Regenerate] [Pause]. /preview generates on demand; /pause and /resume work from any conversation."
              tech="Telegram Bot API · webhook secret · MarkdownV2"
            />
          </div>
        </section>

        {/* ─── ARCHITECTURE DIAGRAM (SVG) ────────────────────────── */}
        <section className="mt-24">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">Under the hood</p>
          <h2 className="mt-3 text-[28px] font-semibold tracking-heading-sm text-ink sm:text-[32px]">
            One Next.js app, four moving pieces.
          </h2>

          <TaskCard tone="ice" className="mt-8 overflow-hidden p-0">
            <ArchitectureDiagram />
          </TaskCard>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ArchPiece
              tone="violet"
              title="Web app"
              body="Next.js 15.5 + Tailwind v4 + Aboard design tokens. App Router server components, Server Actions, SSE streams."
            />
            <ArchPiece
              tone="pink"
              title="Postgres (Neon)"
              body="13 tables. Multi-tenant with row-level tenant_id. Drizzle ORM. Custom migration script — no drizzle-kit prompts."
            />
            <ArchPiece
              tone="mint"
              title="Anthropic"
              body="Opus 4.7 for the discovery conversation (cached skill prefix). Sonnet 4.6 for seed generation and daily briefings."
            />
            <ArchPiece
              tone="yellow"
              title="Vercel"
              body="Edge hosting, serverless functions, hourly… er, daily cron. Env vars per environment. Auto-deploy on git push."
            />
          </div>
        </section>

        {/* ─── BUILD STATUS TIMELINE ─────────────────────────────── */}
        <section className="mt-24">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">Where we are</p>
          <h2 className="mt-3 text-[28px] font-semibold tracking-heading-sm text-ink sm:text-[32px]">
            Seven phases, six shipped.
          </h2>

          <div className="mt-10 space-y-3">
            <PhaseRow status="done" id="0" title="Foundation" body="Next.js 15.5 scaffold, Aboard design tokens, system-ui type system, Pill/Ghost/TaskCard primitives, marketing landing page." />
            <PhaseRow status="done" id="1" title="Persistence + magic-link auth" body="Postgres schema (13 tables), Drizzle ORM, custom migration script, NextAuth v5 (Resend provider + email + dev-backdoor demo mode), middleware-less route guarding." />
            <PhaseRow status="done" id="2" title="Discovery agent" body="Verbatim discovery skill as system prompt with cache_control. Four tools wired server-side. SSE-streamed chat with live profile panel and <quick> reply pill extraction." />
            <PhaseRow status="done" id="3" title="Self-learning baseline (synthetic head start)" body="LLM-generated baseline with Zod validation + Faker fallback. Index-based references resolved to UUIDs. One-transaction insert. /dashboard/data viewer with synthetic vs owner-logged source pills on every row." />
            <PhaseRow status="done" id="4" title="Daily briefing engine" body="Tenant-aware SQL snapshots (timezone-correct via date-fns-tz). Sonnet generator with strict format. Daily Vercel Cron, idempotent on (tenant_id, for_date). Aging job keeps the synthetic clock alive while owner-logged rows accumulate." />
            <PhaseRow status="done" id="5" title="Self-learning chat" body="/dashboard/learn lets the owner type real events in plain language. Four tools (record_person, record_event, record_booking, record_payment) write owner_logged rows alongside the synthetic baseline. Fuzzy name matching + natural-language time parsing in the tenant's timezone." />
            <PhaseRow status="done" id="6" title="Telegram delivery" body="One shared bot, one-time linking code, MarkdownV2 send helpers, /pause /resume /preview commands, callback queries from inline buttons. Webhook secret verification. Cron fans out daily briefings to every linked owner." />
            <PhaseRow status="next" id="7" title="Dashboard polish" body="Profile editor, settings (timezone language), bottom FloatingPillBar nav across dashboard routes, focus rings and motion-reduced fallbacks, Sunday weekly recap layered on top of daily." />
          </div>
        </section>

        {/* ─── NUMBERS THAT MATTER ───────────────────────────────── */}
        <section className="mt-24">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">Numbers</p>
          <h2 className="mt-3 text-[28px] font-semibold tracking-heading-sm text-ink sm:text-[32px]">
            The cost and shape of the platform.
          </h2>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Metric value="~10" unit="turns" label="Average discovery conversation length" tone="pink" />
            <Metric value="~70s" unit="" label="Seed-data generation (one Sonnet call)" tone="violet" />
            <Metric value="~10s" unit="" label="Briefing generation (Sonnet)" tone="mint" />
            <Metric value="~$0.02" unit="/day" label="Total LLM cost per active tenant" tone="yellow" />
          </div>
        </section>

        {/* ─── WHAT'S NEXT ────────────────────────────────────────── */}
        <section className="mt-24">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">Next steps</p>
          <h2 className="mt-3 text-[28px] font-semibold tracking-heading-sm text-ink sm:text-[32px]">
            Where Zarg is heading.
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            <TaskCard tone="sky" className="p-7">
              <p className="text-[11px] uppercase tracking-[1.5px] text-outline-blue">Near term</p>
              <h3 className="mt-2 text-[20px] font-semibold text-ink">Sunday weekly recap</h3>
              <ul className="mt-4 space-y-1.5 text-[14px] leading-[1.55] text-ink/85">
                <li>• On top of the daily, a Sunday-evening retrospective</li>
                <li>• Money this week vs last, attendance trend, package churn risk</li>
                <li>• 3 actions for the upcoming week, not the next day</li>
                <li>• Lower frequency = denser signal, lower fatigue</li>
              </ul>
            </TaskCard>

            <TaskCard tone="pink" className="p-7">
              <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">Soon</p>
              <h3 className="mt-2 text-[20px] font-semibold text-ink">Finish the dashboard</h3>
              <ul className="mt-4 space-y-1.5 text-[14px] leading-[1.55] text-ink/85">
                <li>• Profile editor — change anything Zarg learned</li>
                <li>• Telegram link page with QR code</li>
                <li>• Settings: timezone, briefing time, pause/resume</li>
                <li>• Bottom FloatingPillBar nav across all dashboard routes</li>
                <li>• Sunday weekly recap layered on top of daily</li>
              </ul>
            </TaskCard>

            <TaskCard tone="violet" className="p-7">
              <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">Later</p>
              <h3 className="mt-2 text-[20px] font-semibold text-ink">More self-learning channels</h3>
              <ul className="mt-4 space-y-1.5 text-[14px] leading-[1.55] text-ink/85">
                <li>• Stripe webhook → owner_logged payments automatically</li>
                <li>• Google Calendar / iCal sync → owner_logged events</li>
                <li>• Forward a WhatsApp / Telegram chat snippet → parsed bookings</li>
                <li>• Sheets sync for owners who already track in one</li>
                <li>• Synthetic baseline retired entirely once real signal is dense</li>
              </ul>
            </TaskCard>

            <TaskCard tone="mint" className="p-7">
              <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">Vision</p>
              <h3 className="mt-2 text-[20px] font-semibold text-ink">Agentic platform, not just a briefing</h3>
              <ul className="mt-4 space-y-1.5 text-[14px] leading-[1.55] text-ink/85">
                <li>• Owner replies "send the renewal nudge" — Zarg drafts and sends</li>
                <li>• Schedule changes through chat: "move Wed 19:00 to 18:00"</li>
                <li>• Multi-language (Armenian / Russian / English) per tenant</li>
                <li>• Owner-side voice on Telegram via STT/TTS</li>
                <li>• Marketplace of vertical templates (yoga, salon, tutoring, clinic)</li>
              </ul>
            </TaskCard>
          </div>
        </section>

        {/* ─── CTA ───────────────────────────────────────────────── */}
        <section className="mt-24">
          <TaskCard tone="yellow" className="p-10 md:p-12">
            <h2 className="text-[28px] font-semibold tracking-heading-sm text-ink sm:text-[36px]">
              Want to feel it?
            </h2>
            <p className="mt-3 max-w-xl text-[16px] leading-[1.55] text-ink/85">
              Sign up takes one click in demo mode. Drive a real discovery conversation, watch the
              profile panel fill in, finalize, get your first briefing.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <PillLink href="/signup" size="lg">
                Try the prototype
              </PillLink>
              <GhostLink href="https://github.com/artshamtsyan/zarg" external>
                See the code on GitHub
              </GhostLink>
            </div>
          </TaskCard>
        </section>

        <footer className="mt-24 border-t border-whisper-gray/40 pt-8">
          <p className="text-[13px] text-slate">
            Zarg · A DINNO prototype · Built in 2026 · Designed with the Aboard light pastel system
          </p>
        </footer>
      </div>
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function FlowStep({
  tone,
  tag,
  title,
  body,
  tech,
}: {
  tone: "pink" | "violet" | "mint" | "sky" | "yellow";
  tag: string;
  title: string;
  body: string;
  tech: string;
}) {
  return (
    <TaskCard tone={tone} className="p-6 md:p-7">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[140px_1fr_auto] md:items-baseline">
        <span className="text-[11px] uppercase tracking-[1.8px] text-ink/60">{tag}</span>
        <div>
          <h3 className="text-[18px] font-semibold text-ink">{title}</h3>
          <p className="mt-1.5 text-[15px] leading-[1.55] text-ink/80">{body}</p>
        </div>
        <span className="rounded-full bg-canvas-ice px-3 py-1 text-[12px] text-ink/70 md:whitespace-nowrap">
          {tech}
        </span>
      </div>
    </TaskCard>
  );
}

function ArchPiece({
  tone,
  title,
  body,
}: {
  tone: "pink" | "violet" | "mint" | "sky" | "yellow";
  title: string;
  body: string;
}) {
  return (
    <TaskCard tone={tone} className="p-5">
      <h4 className="text-[15px] font-semibold text-ink">{title}</h4>
      <p className="mt-2 text-[13px] leading-[1.55] text-ink/80">{body}</p>
    </TaskCard>
  );
}

function PhaseRow({
  status,
  id,
  title,
  body,
}: {
  status: "done" | "next" | "pending";
  id: string;
  title: string;
  body: string;
}) {
  const dot =
    status === "done"
      ? "bg-accent-teal"
      : status === "next"
        ? "bg-accent-orange"
        : "bg-whisper-gray";
  const label =
    status === "done" ? "Shipped" : status === "next" ? "In flight" : "Queued";
  return (
    <div className="grid grid-cols-[44px_1fr_auto] items-baseline gap-4 rounded-[20px] border border-whisper-gray/30 bg-canvas-ice px-5 py-4">
      <div className="flex items-center gap-3">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-[14px] font-semibold text-slate">P{id}</span>
      </div>
      <div>
        <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-[14px] leading-[1.5] text-ink/75">{body}</p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[1px] ${
          status === "done"
            ? "bg-task-card-mint text-ink"
            : status === "next"
              ? "bg-task-card-yellow text-ink"
              : "bg-whisper-gray/30 text-slate"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function Metric({
  value,
  unit,
  label,
  tone,
}: {
  value: string;
  unit: string;
  label: string;
  tone: "pink" | "violet" | "mint" | "sky" | "yellow";
}) {
  return (
    <TaskCard tone={tone} className="p-6">
      <p className="flex items-baseline gap-1 text-ink">
        <span className="text-[36px] font-semibold leading-[1] tracking-heading-sm">{value}</span>
        {unit && <span className="text-[14px] font-medium text-ink/70">{unit}</span>}
      </p>
      <p className="mt-3 text-[13px] leading-[1.4] text-ink/75">{label}</p>
    </TaskCard>
  );
}

function ArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 800 460"
      className="block w-full"
      role="img"
      aria-label="Architecture diagram showing Browser, Vercel functions, Anthropic, Telegram, and Neon Postgres"
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#262626" />
        </marker>
      </defs>

      {/* Browser */}
      <g>
        <rect x="40" y="40" width="180" height="80" rx="20" fill="#afe4ff" />
        <text x="130" y="72" textAnchor="middle" fontSize="13" fontWeight="600" fill="#262626" fontFamily="system-ui">
          Owner's browser
        </text>
        <text x="130" y="92" textAnchor="middle" fontSize="11" fill="#262626" fontFamily="system-ui">
          Discovery chat · dashboard
        </text>
      </g>

      {/* Vercel core */}
      <g>
        <rect x="280" y="20" width="240" height="160" rx="22" fill="#fbcfe8" />
        <text x="400" y="48" textAnchor="middle" fontSize="11" fontWeight="600" fill="#262626" letterSpacing="1.5" fontFamily="system-ui">
          ZARG · NEXT.JS ON VERCEL
        </text>
        <rect x="298" y="62" width="100" height="34" rx="10" fill="#fafafa" />
        <text x="348" y="82" textAnchor="middle" fontSize="11" fontWeight="600" fill="#262626" fontFamily="system-ui">
          /signup · /onboarding
        </text>
        <rect x="404" y="62" width="100" height="34" rx="10" fill="#fafafa" />
        <text x="454" y="82" textAnchor="middle" fontSize="11" fontWeight="600" fill="#262626" fontFamily="system-ui">
          /dashboard
        </text>
        <rect x="298" y="104" width="206" height="34" rx="10" fill="#fafafa" />
        <text x="401" y="124" textAnchor="middle" fontSize="11" fontWeight="600" fill="#262626" fontFamily="system-ui">
          /api/discovery · /api/briefings
        </text>
        <rect x="298" y="146" width="206" height="22" rx="8" fill="#ffe77a" />
        <text x="401" y="161" textAnchor="middle" fontSize="10" fontWeight="600" fill="#262626" fontFamily="system-ui">
          Vercel Cron — daily 05:00 UTC
        </text>
      </g>

      {/* Anthropic */}
      <g>
        <rect x="580" y="40" width="180" height="80" rx="20" fill="#e6dafd" />
        <text x="670" y="72" textAnchor="middle" fontSize="13" fontWeight="600" fill="#262626" fontFamily="system-ui">
          Anthropic
        </text>
        <text x="670" y="92" textAnchor="middle" fontSize="11" fill="#262626" fontFamily="system-ui">
          Opus 4.7 · Sonnet 4.6
        </text>
      </g>

      {/* Telegram */}
      <g>
        <rect x="580" y="160" width="180" height="80" rx="20" fill="#b6edee" />
        <text x="670" y="192" textAnchor="middle" fontSize="13" fontWeight="600" fill="#262626" fontFamily="system-ui">
          Telegram Bot API
        </text>
        <text x="670" y="212" textAnchor="middle" fontSize="11" fill="#262626" fontFamily="system-ui">
          @ZargBot · webhook + send
        </text>
      </g>

      {/* Neon */}
      <g>
        <rect x="280" y="280" width="240" height="120" rx="22" fill="#ffe77a" />
        <text x="400" y="312" textAnchor="middle" fontSize="11" fontWeight="600" fill="#262626" letterSpacing="1.5" fontFamily="system-ui">
          NEON POSTGRES
        </text>
        <text x="400" y="338" textAnchor="middle" fontSize="13" fill="#262626" fontFamily="system-ui">
          tenants · users · profiles
        </text>
        <text x="400" y="358" textAnchor="middle" fontSize="13" fill="#262626" fontFamily="system-ui">
          people · events · bookings
        </text>
        <text x="400" y="378" textAnchor="middle" fontSize="13" fill="#262626" fontFamily="system-ui">
          payments · packages · briefings
        </text>
      </g>

      {/* Email (Resend) */}
      <g>
        <rect x="40" y="200" width="180" height="80" rx="20" fill="#e0f2fe" />
        <text x="130" y="232" textAnchor="middle" fontSize="13" fontWeight="600" fill="#262626" fontFamily="system-ui">
          Resend
        </text>
        <text x="130" y="252" textAnchor="middle" fontSize="11" fill="#262626" fontFamily="system-ui">
          Magic-link sender
        </text>
      </g>

      {/* Arrows */}
      <line x1="220" y1="80" x2="280" y2="80" stroke="#262626" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <line x1="520" y1="80" x2="580" y2="80" stroke="#262626" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <line x1="280" y1="100" x2="220" y2="240" stroke="#262626" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <line x1="400" y1="180" x2="400" y2="280" stroke="#262626" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <line x1="520" y1="180" x2="580" y2="200" stroke="#262626" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <line x1="580" y1="200" x2="520" y2="180" stroke="#262626" strokeWidth="1.5" markerEnd="url(#arrow)" />

      {/* Labels */}
      <text x="250" y="72" fontSize="10" fill="#757577" fontFamily="system-ui">SSE</text>
      <text x="550" y="72" fontSize="10" fill="#757577" fontFamily="system-ui">tools</text>
      <text x="240" y="170" fontSize="10" fill="#757577" fontFamily="system-ui">email</text>
      <text x="410" y="225" fontSize="10" fill="#757577" fontFamily="system-ui">Drizzle</text>
      <text x="544" y="195" fontSize="10" fill="#757577" fontFamily="system-ui">DM</text>
    </svg>
  );
}
