# Zarg — Implementation Plan

**Date:** 2026-05-16
**Spec:** [2026-05-16-zarg-design.md](../specs/2026-05-16-zarg-design.md)

This plan turns the approved design spec into an ordered, buildable sequence. Each phase ends at a runnable milestone — something the user can see working before the next phase starts.

---

## Phase 0 — Foundation (no runtime dependencies)

**Goal:** `npm install && npm run dev` opens a styled landing page in Dimension's dark aesthetic. No DB, no LLM, no Telegram required.

Tasks:
1. Scaffold Next.js 15 (App Router, TypeScript, ESLint)
2. Tailwind v4 with the Dimension `@theme` tokens dropped into `app/globals.css`
3. `next/font/google` loading Geist + DM Sans with Inter / system-ui fallbacks
4. Component primitives in `components/ui/`: `Pill`, `Ghost`, `SpotlightCard`, `GhostCard`, `FloatingPillBar`, plus a `BottomNav` shell
5. Marketing landing page (`app/page.tsx`) with the gradient-aura hero and three feature cards
6. `.env.example` with every variable Phase 1+ will need
7. `README.md` with run instructions

**Milestone:** the landing page is up locally.

---

## Phase 1 — Persistence

**Goal:** schema is migrated, signup creates rows, auth works.

Tasks:
1. Postgres connection helper (`lib/db/client.ts`) — Neon HTTP driver in production, local Postgres in dev
2. Drizzle schema files for every table from spec §4
3. `drizzle.config.ts` + `pnpm db:push` / `pnpm db:migrate` scripts
4. NextAuth v5 with email provider via Resend
5. `app/signup/page.tsx` — name + email form, creates `tenant` (`status='onboarding'`) and `owner` rows in one transaction, kicks off magic-link send
6. `app/auth/verify-request/page.tsx` and `/auth/callback`
7. Middleware: redirect `onboarding` tenants to `/onboarding`, block `/dashboard/*` until status is `active`

**Milestone:** sign up, click magic link in email, land on `/onboarding`.

---

## Phase 2 — Discovery agent

**Goal:** the ~10-turn discovery conversation runs, the profile panel lights up in real time, finalization writes a complete `business_profile`.

Tasks:
1. Copy `telegram_automation_discovery_skill_optimized.md` to `lib/ai/prompts/discovery-skill.md` (verbatim)
2. `lib/ai/discovery.ts` — Anthropic client wrapper, system prompt assembly, `cache_control` on the skill prefix, tool definitions (`record_profile_field`, `propose_workflow`, `assess_automation`, `finalize_profile`)
3. `POST /api/discovery/turn` — SSE streaming endpoint; persists each turn to `discovery_messages`, applies tool calls to `business_profiles`
4. `POST /api/discovery/finalize` — flips tenant to `active`, snapshots `raw_transcript`, kicks off seed generation
5. `app/(onboarding)/onboarding/page.tsx` — split chat / profile-panel layout per the Dimension visual spec
6. `app/(onboarding)/onboarding/done/page.tsx` — full spec preview + "Looks good"

**Milestone:** a fresh tenant can finish discovery and see their generated profile.

---

## Phase 3 — Seed data

**Goal:** finalization produces a believable 4-week operational dataset; the dashboard shows real rows.

Tasks:
1. `lib/ai/seed.ts` — `emit_seed_data` tool call with strict Zod schema covering people/events/bookings/payments/packages
2. Validation retry loop (1×) then procedural Faker fallback
3. Insert pipeline that writes all five tables in a single DB transaction
4. `app/(dashboard)/dashboard/data/page.tsx` — read-only tables with the persistent "Demo data" banner

**Milestone:** post-discovery, `/dashboard/data` shows the seeded entities.

---

## Phase 4 — Daily briefing

**Goal:** an on-demand "Preview tomorrow's briefing" works end to end. Cron is wired but not yet sending to Telegram.

Tasks:
1. `lib/db/snapshots.ts` — SQL queries that build the data snapshot defined in spec §7
2. `lib/ai/briefing.ts` — assembles input, calls Sonnet, returns markdown body
3. `POST /api/briefings/preview` — runs the generator, persists a `briefings` row with `status='queued'` and `for_date = tomorrow`
4. `app/(dashboard)/dashboard/briefings/page.tsx` — preview card + past briefings list
5. `app/(dashboard)/dashboard/page.tsx` (home) — "Tomorrow's briefing (preview)" Translucent Spotlight Card
6. Daily aging job (`lib/jobs/age-data.ts`) — slides synthetic clock forward
7. `POST /api/cron/daily-briefings` — hourly fan-out; for now writes briefings but skips Telegram (next phase wires it)
8. `vercel.json` cron declaration

**Milestone:** click "Preview tomorrow's briefing" → see the rendered markdown.

---

## Phase 5 — Telegram

**Goal:** owner can link Telegram and receive the daily briefing as a DM.

Tasks:
1. `lib/telegram/client.ts` + `lib/telegram/send.ts` — MarkdownV2 escape helper, `sendBriefing`, `editBriefing`
2. `lib/telegram/webhook.ts` — update router (`/start <code>`, `/start`, `/pause`, `/resume`, `/preview`, callback queries)
3. `POST /api/telegram/webhook` — verifies the secret token header, dispatches to the router
4. Linking flow: code generation on `/dashboard/telegram`, deep link to `t.me/ZargBot?start=...`, owner-row update on webhook hit
5. `app/(dashboard)/dashboard/telegram/page.tsx` — code card → linked state, briefing-time picker, pause/resume
6. Wire `/api/cron/daily-briefings` to actually send via Telegram for linked owners
7. `scripts/register-webhook.ts` and `scripts/set-bot-commands.ts`

**Milestone:** end-to-end demo (the §11 storyboard) runs.

---

## Phase 6 — Dashboard polish

**Goal:** the shell looks like Dimension, nav works, profile is editable.

Tasks:
1. `app/(dashboard)/layout.tsx` — top bar + sticky bottom FloatingPillBar nav
2. `app/(dashboard)/dashboard/profile/page.tsx` — section-per-group editor over `business_profiles`
3. `app/(dashboard)/dashboard/settings/page.tsx` — name, timezone, briefing time, language
4. Status chips on briefings, focus rings, motion-reduced fallbacks
5. Empty / error states for every page

**Milestone:** the app feels finished enough to demo confidently.

---

## Phase 7 — Pre-demo checks

1. End-to-end manual run of the §11 storyboard with two tenants (yoga + salon vocab)
2. Cost check: discovery + seed + 1 briefing < $0.50 total per tenant
3. Latency check: discovery turn < 6 s p95; briefing generation < 10 s
4. Document the demo script in `docs/demo-script.md`

---

## Dependencies and risks

- **External keys needed before Phase 1 runs in production:** `DATABASE_URL` (Neon), `ANTHROPIC_API_KEY`, `RESEND_API_KEY`. Phase 5 also needs `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET`. For local development, Phases 0–4 can run against a local Postgres and a single Anthropic key.
- **Telegram webhook requires a public HTTPS URL.** During local dev, point the bot at an ngrok tunnel or skip Phase 5 until first cloud deploy.
- **Vercel Cron is the assumed scheduler.** If hosting elsewhere, swap for the equivalent (GitHub Actions, Render cron, etc.). The cron endpoint itself is hosting-agnostic.

---

## Out of scope (deferred from spec §10)

Listed for clarity so they don't sneak in: real data integrations, billing, student-facing bot, multi-owner roles, multi-language, weekly digest, PDF export, custom per-tenant bots, analytics dashboard.

---

## Build order summary

Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7

This is the dependency order. Phases 3 and 4 can in theory parallelize once Phase 2 is done, but the demo needs Phase 3's data before Phase 4 produces meaningful briefings.
