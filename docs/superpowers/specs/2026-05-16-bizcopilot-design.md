# BizCopilot — Design Spec

**Date:** 2026-05-16
**Status:** Approved for implementation planning
**Working name:** `bizcopilot`

---

## 1. What we are building

A multi-tenant web platform where any small-business owner can sign up, complete a Claude-powered discovery conversation about how their business runs today, and start receiving a daily operations briefing via Telegram. The yoga studio described in `yoga_studio_telegram_automation_spec.md` is the reference seed example; the platform is built to onboard any small business in the same shape (salon, tutor, clinic, etc.).

The discovery conversation is the central agentic moment: it follows the methodology in `telegram_automation_discovery_skill_optimized.md`, runs as the signup flow, and produces a structured business profile that drives everything downstream — synthetic seed data and the daily briefing.

The student-facing Telegram bot from the yoga spec is explicitly **out of scope** for v1. The prototype is owner-side only.

---

## 2. Goals and non-goals

**Goals**
- End-to-end demoable signup → discovery → daily Telegram briefing in a single TypeScript repo
- Generalize cleanly across small-business verticals via a structured business profile and generic operational entities (people / events / payments / packages)
- LLM-driven where it matters (discovery, seed generation, briefing), simple SQL where it doesn't
- Each tenant's briefing must feel specific to their business on day one — no empty states

**Non-goals (v1)**
- Real data-source integrations (Sheets / CRM / Stripe)
- Platform billing
- Student-facing Telegram booking flow
- Multi-owner / staff roles per tenant
- Translation (`language` field stored, English text only)
- PDF / accountant export

---

## 3. Architecture

Single Next.js 15 app (TypeScript, App Router) with Postgres, deployed on Vercel + Neon.

- **Web app** — signup, discovery chat, business-profile view, briefing preview, Telegram link page
- **Postgres** — tenants, owners, business profiles, seeded operational data, briefing history
- **LLM layer** — Anthropic SDK with prompt caching
  - `claude-opus-4-7` for the discovery conversation
  - `claude-sonnet-4-6` for seed-data generation and daily briefings
- **Telegram** — one shared platform bot in webhook mode (`@BizCopilotBot`); per-tenant linking via one-time code
- **Scheduler** — Vercel Cron hits `/api/cron/daily-briefings` hourly; the endpoint fans out to tenants whose local briefing time falls in this UTC hour
- **Auth** — NextAuth (Auth.js v5) with email magic links via Resend

### Repo layout

```
bizcopilot/
  app/
    (auth)/                 signup, login, magic-link callback
    (onboarding)/           discovery chat, finalization
    (dashboard)/            profile, briefings, telegram, data, settings
    api/
      discovery/turn/
      discovery/finalize/
      telegram/webhook/
      cron/daily-briefings/
      briefings/preview/
      briefings/regenerate/
  lib/
    db/                     Drizzle schema + queries
    ai/
      prompts/
        discovery-skill.md  verbatim copy of the discovery skill
        briefing-system.md
        seed-system.md
      discovery.ts          discovery turn handler
      briefing.ts           briefing generator
      seed.ts               synthetic data generator
    telegram/
      client.ts             SDK wrapper
      send.ts               sendBriefing, editBriefing, MarkdownV2 helper
      webhook.ts            update router
    auth/                   NextAuth config
  drizzle/                  migrations
  scripts/
    register-webhook.ts
    set-bot-commands.ts
  docs/superpowers/specs/   this file
```

---

## 4. Data model

Multi-tenancy is row-level. Every operational row carries `tenant_id`. All money is stored as integer minor units plus an ISO currency code — no floats.

### Tenancy & profile

```
tenants
  id (uuid, pk)
  name                       e.g. "Avan Yoga"
  domain                     "yoga" | "salon" | "tutoring" | "clinic" | "other"
  location                   free text, defaults to "Armenia"
  timezone                   IANA, e.g. "Asia/Yerevan"
  briefing_local_time        "HH:MM", default "08:00"
  language                   "en" in v1
  status                     "onboarding" | "active" | "paused"
  created_at

owners
  id (uuid, pk)
  tenant_id (fk)
  email (unique)
  full_name
  telegram_chat_id           nullable, unique
  telegram_link_code         nullable, expires after 15 min
  telegram_link_expires_at   nullable
  role                       "owner" (only role in v1)
  created_at

business_profiles
  id (uuid, pk)
  tenant_id (fk, unique)
  current_state              jsonb  — how the work is done today
  goals                      jsonb  — which impact signals matter
  key_workflows              jsonb  — list of workflows discovered
  kpis                       jsonb  — metrics to surface in briefings
  entities                   jsonb  — vocabulary: { people_label, events_label, ... }
  proposed_flow              jsonb  — discovery skill's proposed flow output
  mvp_scope                  jsonb
  risks                      jsonb
  raw_transcript             jsonb  — full discovery conversation
  updated_at

discovery_messages
  id, tenant_id, role ("user"|"assistant"|"tool"), content, tool_calls jsonb, created_at
```

### Synthetic operational data (generic across verticals)

```
people
  id, tenant_id, name, phone, status, segment, notes, joined_at

events
  id, tenant_id, starts_at, duration_min, staff_name, capacity, type, status

bookings
  id, tenant_id, person_id, event_id, status, booked_at, attendance

payments
  id, tenant_id, person_id, amount_minor, currency, method, status, ref, paid_at, kind
  -- kind: "single" | "package" | "trial"

packages
  id, tenant_id, person_id, kind, visits_total, visits_remaining, started_at, expires_at, status
```

### Briefings

```
briefings
  id, tenant_id, for_date, body_markdown, telegram_message_id,
  status ("queued"|"sent"|"failed"|"skipped"),
  generated_at, sent_at, error
  unique(tenant_id, for_date)
```

### Why generalize to people/events

The yoga spec uses students/classes. A salon would use clients/appointments. The schema stays the same; `business_profiles.entities` carries the vocabulary (e.g., `{ people_label: "students", events_label: "classes" }`) and the briefing prompt uses those labels in natural language. No per-vertical migrations.

---

## 5. Discovery conversation

The Discovery skill becomes the signup flow.

### Mechanics

- `POST /api/discovery/turn` accepts the message history and returns the next assistant turn (streamed via SSE).
- Anthropic call to `claude-opus-4-7`:
  - System prompt = the verbatim discovery skill from `lib/ai/prompts/discovery-skill.md`
  - Cached via `cache_control` so the skill text + early turns form a stable prefix
  - Tool use enabled — the model emits at most one tool call per turn alongside its natural-language reply
- Tools:
  - `record_profile_field(field, value)` — writes to `business_profiles` (current_state, goals, kpis, entities, etc.)
  - `propose_workflow(workflow)` — appends to `key_workflows`
  - `assess_automation(impact, feasibility, recommendation)` — fills the assessment slot
  - `finalize_profile()` — signals discovery complete; backend triggers seed generation and flips tenant `status` to `active`

The model also returns a `suggested_replies: string[]` field in its structured output for quick-reply buttons.

### Conversation arc (enforced by the system prompt)

1. Greet, capture business name, domain, location, owner role
2. Manual-action discovery: how the work is done today
3. Goals: which impact signals matter (growth, retention, efficiency, financial clarity)
4. Data inputs: what info is collected today (names, phones, dates, payments)
5. Constraints: what the bot must never do, what needs human approval
6. Success criteria
7. Synthesize: current-state summary, automation assessment, proposed flow, MVP, risks — each emitted as a tool call
8. `finalize_profile()`

Target length: ~7–10 turns. The system prompt enforces batching of related questions.

### UI

- Left: chat with quick-reply buttons sourced from `suggested_replies`
- Right: "Your business profile" panel updating in real time as `record_profile_field` calls land — visceral demonstration that the agent is doing something
- Final screen: full spec (current state → proposed flow → MVP → market scan → risks) with "Looks good — let's go" button

### Resumability

`discovery_messages` persists every turn. Owner can close the tab and resume. `business_profiles.raw_transcript` snapshots the full conversation at finalization for audit and re-runs against improved skill prompts.

---

## 6. Seed-data generation

On `finalize_profile`, the platform synthesizes a 4-week operational dataset for the tenant: last 2 weeks of history + next 2 weeks upcoming.

### Mechanics

- One LLM call to `claude-sonnet-4-6` with the finalized business profile
- System prompt: "Generate a realistic 4-week operational dataset for this business. Output strict JSON matching the schema."
- Structured output via the `emit_seed_data` tool:
  - 15–40 `people` with realistic locale-appropriate names and statuses
  - `events` recurring weekly across the 3–4 staff implied by the profile, spanning last 2 and next 2 weeks
  - `bookings` with attendance for past events
  - `payments` mixed across single/package/trial, mostly successful, a few pending, one refund
  - `packages` active for ~60% of active people, with realistic visits_remaining
- Output validated with Zod before insert. On validation failure, retry once with the validator error appended; if it still fails, fall back to a procedural Faker-based generator so signup never blocks.

### Why LLM-generated instead of procedural

Procedural fakers produce uniform garbage. An LLM-generated dataset uses the profile context to produce coherent, vertical-appropriate data: salon stylists vs yoga instructors vs tutoring sessions, names matching location, plausible numbers. For a prototype demo this is the difference between "neat" and "wait, this is actually for me."

### Daily aging job

In the same cron pass that sends briefings, a small step per tenant slides the synthetic clock forward:
- Marks past events as completed and stamps attendance
- Advances `packages.visits_remaining`
- Adds a few new bookings and payments to keep the dataset alive

### Demo-data badge

Until the tenant connects a real data source (post-prototype), the dashboard shows a "Demo data — not your real customers" badge so the owner never confuses seeded rows for real bookings.

---

## 7. Daily briefing generator

### Trigger

- Vercel Cron hits `POST /api/cron/daily-briefings` hourly
- Endpoint queries `tenants WHERE status='active' AND briefing_local_time falls in this UTC hour`
- For each tenant: age the synthetic data, generate the briefing, deliver via Telegram, record in `briefings`

### Generation

- One LLM call to `claude-sonnet-4-6`
- Inputs assembled by `lib/ai/briefing.ts`:
  - Compact business profile (name, domain, entity vocabulary, KPIs, goals)
  - **Data snapshot** built from SQL against the synthetic tables:
    - Today's events: count, times, staff, capacity vs booked
    - Upcoming-week events: count by day
    - Pending payments: count, total amount
    - New leads in last 7 days
    - Active packages expiring this week (with names)
    - Yesterday's attendance and no-shows
    - Last 7 days revenue total
  - Yesterday's briefing body — for continuity ("yesterday I flagged X, here's the update")

### Output format

System prompt enforces this structure, using vocabulary from `business_profiles.entities`:

```
Good morning, {owner_name}.

**Today** ({weekday}, {date})
• {N} {events_label} scheduled: {times list}
• {bookings_today} {people_label} booked, {capacity_remaining} spots open

**Money**
• Yesterday's revenue: {amount}
• Pending payments: {count} ({amount})

**People**
• {N} new leads this week
• {N} packages expiring in the next 7 days — names: {list}

**Suggested actions**
1. {action}
2. {action}
3. {action}

**Heads-up**
• {anomaly or risk, if any}
```

Suggested actions are the agent's keep-its-keep moment: 3 actions tied to the tenant's stated goals, grounded in the data snapshot. E.g., retention goal + 3 packages expiring → "Message Maria, Anush, Lilit about renewing."

### Preview & control

- Dashboard "Preview tomorrow's briefing" button runs the same generator on demand
- Owner can pause briefings, change briefing time, or regenerate today's
- Regenerated briefings replace the prior Telegram message via `editMessageText` with an "(updated)" marker

### Idempotence & safety

- `unique(tenant_id, for_date)` on `briefings` prevents double-sends
- Failed Telegram sends retry up to 3× over subsequent cron passes, then flag on the dashboard
- One briefing per tenant per day via Telegram; regenerations edit the existing message

### Cost

~2–4k input + 800 output tokens per briefing → ~$0.01–0.02 per tenant per day on Sonnet. Negligible for prototype scale.

---

## 8. Telegram integration

### Linking flow

1. Dashboard shows a one-time code (e.g. `LINK-7K3PQA`) and a deep link `https://t.me/BizCopilotBot?start=LINK-7K3PQA`
2. Owner taps the link → Telegram opens → bot receives `/start LINK-7K3PQA`
3. Webhook matches the code to `owners.telegram_link_code`, writes the sender's `chat_id` to `owners.telegram_chat_id`, clears the code, replies "Linked. Your first briefing arrives tomorrow at {time}."
4. Dashboard polls the owner row and shows "Linked ✓"

Codes expire after 15 minutes; dashboard regenerates on demand. One active code at a time per owner.

### Webhook

`POST /api/telegram/webhook` — verifies the Telegram secret token header, routes a tight set of updates:

| Update | Handling |
| --- | --- |
| `/start <code>` | Linking flow |
| `/start` alone | Reply with signup URL |
| `/pause` | Tenant `status='paused'` (linked-owner check) |
| `/resume` | Reverse |
| `/preview` | On-demand briefing for sender's tenant |
| Other text | Short menu reply |
| `callback_query` from briefing inline buttons | `[Open dashboard] [Regenerate] [Pause briefings]` |

All sends use `parse_mode: 'MarkdownV2'` with a single shared escape helper.

### Library and ops

- `node-telegram-bot-api` for HTTP-call surface only (no polling in serverless)
- Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
- `scripts/register-webhook.ts` sets the webhook URL + secret
- `scripts/set-bot-commands.ts` registers `/pause`, `/resume`, `/preview` for autocomplete

### Why one shared bot

Owners don't need to know what BotFather is. Signup stays ~60 seconds. Per-tenant branded bots are a v2 question, not a prototype concern.

---

## 9. Web app

### Auth

- NextAuth v5 with email magic links via Resend; no passwords
- On first sign-in, the signup form creates the `tenant` (status `onboarding`) and `owner` rows in one transaction
- One owner per tenant in v1

### Routes

```
/                          marketing landing
/signup                    name + email
/auth/verify-request       "check your email"
/auth/callback             magic-link handler

/onboarding                discovery chat (only route while status='onboarding')
/onboarding/done           review profile, confirm to seed data + activate

/dashboard                 home — today's briefing preview, link status, quick stats
/dashboard/profile         view/edit business profile fields
/dashboard/briefings       list of past briefings, preview tomorrow's
/dashboard/telegram        link/unlink, change briefing time, pause/resume
/dashboard/data            read-only seeded data with demo badge
/dashboard/settings        name, timezone, language

/api/discovery/turn
/api/discovery/finalize
/api/cron/daily-briefings
/api/telegram/webhook
/api/briefings/preview
/api/briefings/regenerate
```

Middleware redirects `onboarding` tenants to `/onboarding` and blocks `/dashboard/*` until status is active.

### UI stack

Tailwind + shadcn/ui. Chat uses a simple streaming-text component reading from the Anthropic SSE response. The profile panel revalidates via SWR after each turn.

---

## 10. MVP cut

**In v1**
- Email magic-link signup, one owner per tenant
- Discovery chat with the Discovery skill as system prompt, structured tool calls, live profile panel
- LLM-generated synthetic seed dataset on finalization
- Daily synthetic-data aging job
- Daily Telegram briefing in the ops-snapshot format with 3 suggested actions
- Telegram linking via one-time code and shared platform bot
- `/pause`, `/resume`, `/preview` Telegram commands
- Dashboard: today's briefing preview, profile view/edit, briefing history, Telegram link page, seeded-data view, settings
- English only

**Out of v1**
- Real data-source connections (Sheets, CRM, Stripe)
- Platform-level billing
- Student-facing Telegram bot
- Multi-owner / staff roles per tenant
- Multi-language (schema field exists, no translation pipeline)
- Weekly digest
- Spec export to PDF / accountant export
- Per-tenant custom bots
- Analytics dashboard (metrics tracked but not visualized)

---

## 11. Demo storyboard

1. Land on marketing page → "Get your daily briefing" → enter "Avan Yoga" + email → click magic link
2. Land in discovery chat. Have a ~10-turn conversation about how the studio runs today. Watch the right-hand profile panel light up field by field.
3. Finalization screen: full spec (current state → proposed flow → MVP → market scan → risks). Click "Looks good."
4. Brief loading state while seed data generates. Land on the dashboard with tomorrow's briefing preview already visible.
5. Click "Link Telegram" → open bot → `/start LINK-…` → DM confirms link.
6. Click "Send me a preview now" → Telegram DM arrives with an ops-snapshot briefing for Avan Yoga: realistic classes, students, payments, and 3 goal-tied actions.
7. Sign up a second tenant ("Yerevan Hair Studio"). Different vocabulary, different seeded data, different briefing — same platform.

---

## 12. Risks

- **Discovery feels like a long form.** Mitigation: hard 10-turn target enforced by system prompt; quick-reply buttons; batching related questions; live profile panel as feedback.
- **LLM seed generation occasionally produces invalid JSON.** Mitigation: Zod validator, one retry with error, fall back to procedural Faker seeder so signup never blocks.
- **Telegram MarkdownV2 escaping is fragile.** Mitigation: a single shared escape helper used by every send path; integration test that round-trips a briefing through escape + Telegram's parse.
- **Briefing reads stale data on a serverless cold start.** Mitigation: aging job and briefing generator run in the same request, in order; both within a single DB transaction per tenant.
- **Cron firing at the boundary of two hours misses a tenant.** Mitigation: query uses an inclusive lower / exclusive upper bound on `briefing_local_time` against the current UTC hour, and `briefings` has a unique constraint so retries are safe.
- **Cost of LLM-generated seeds at scale.** Not a prototype concern (~cents per tenant). Will be revisited if the platform sees real growth.

---

## 13. Open questions left for implementation planning

- Hosting choice: assumed Vercel + Neon; if DINNO prefers AWS/Azure, the cron and webhook pieces need to be re-mapped (EventBridge / Functions). Cheap to swap.
- Exact bot username — `@BizCopilotBot` is a placeholder pending availability on BotFather.
- Whether the "Demo data" badge should be more prominent (e.g., a permanent banner) — judgment call we'll make during UI build.
