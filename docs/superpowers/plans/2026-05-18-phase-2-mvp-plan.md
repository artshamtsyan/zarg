# StarUp — Phase 2 MVP Plan

**Date:** 2026-05-18
**Status:** Active build
**Window:** 4 weeks to first 5 paying pilots

## Context

Phase 1 (the prototype, StarUp) shipped end-to-end and received positive operational feedback after the first Telegram briefing landed. Phase 2 turns the prototype into a paid MVP that 5 real small businesses can use. The product is rebranded to **StarUp**.

## Scope locked

In:
- Excel/CSV customer upload
- iCal URL paste + hourly sync
- Real Resend magic-link auth on `starup.am`
- Per-tenant Anthropic spend ceiling
- Stripe subscriptions: 30-day free trial → $15/month
- `/dashboard/sources` page
- Privacy + ToS pages
- Pilot onboarding playbook
- Vercel Pro upgrade

Out (deferred to v2.1 after pilot feedback):
- Google Calendar OAuth (iCal covers the use case)
- Instagram + Facebook Graph API
- Multilingual briefings
- Sentry / external monitoring
- Per-tenant custom Telegram bot
- In-app payment for end customers' purchases

## Week-by-week

### Week 1 — Production foundation + Excel upload

- D1 — Rebrand StarUp → StarUp. Vercel Pro upgrade. `starup.am` custom domain. Begin Resend DNS verification.
- D2 — Real magic-link auth. Drop `AUTH_DEV_BACKDOOR`. End-to-end signup test.
- D3 — `usage_events` table. Anthropic spend tracking helper. Daily per-tenant cap.
- D4 — Excel/CSV upload UI + parser + column mapping.
- D5 — Insert pipeline writes `source='imported'`. Dedup by name. Manual test with real spreadsheet.

### Week 2 — iCal sync + sources page

- D6 — `tenant_integrations` table. `/dashboard/sources` page.
- D7 — iCal URL paste flow + initial import.
- D8 — Hourly iCal sync cron + dedup by `(starts_at, ical_uid)`.
- D9 — iCal edge cases (recurring, timezone drift, cancellations).
- D10 — Source counts on dashboard home. Settings polish.

### Week 3 — Stripe billing

- D11–12 — Stripe Checkout. Customer + subscription created on signup. Trial state.
- D13 — Stripe webhook handler. Tenant `billingStatus` mirroring.
- D14 — Trial-end paywall. Billing page with Stripe Customer Portal link.
- D15 — Manual test of full billing lifecycle.

### Week 4 — Polish + pilot launch

- D16 — Privacy + ToS pages. Tenant deletion endpoint.
- D17 — Pilot onboarding playbook (Notion doc).
- D18 — Pricing page on landing site.
- D19 — Dress rehearsal — full signup + use as a real owner.
- D20 — Begin pilot outreach.

## Architectural additions

New tables:

```
tenant_integrations
  id, tenant_id, kind ('ical' | 'csv_upload'), status, config jsonb,
  last_sync_at, last_error, created_at

usage_events
  id, tenant_id, kind ('discovery'|'seed'|'briefing'|'learn'),
  tokens_in, tokens_out, cost_minor, currency='USD', occurred_at

tenant_billing
  tenant_id (pk), stripe_customer_id, stripe_subscription_id,
  status ('trialing'|'active'|'past_due'|'canceled'|'incomplete'),
  trial_ends_at, current_period_end, updated_at
```

New routes:

```
/dashboard/sources
/dashboard/sources/upload
/dashboard/billing
/api/sources/csv/upload
/api/sources/ical/sync       (cron + on-demand)
/api/billing/checkout         (POST → Stripe Checkout session)
/api/billing/portal           (POST → Stripe Customer Portal session)
/api/billing/webhook          (Stripe webhooks)
/api/cron/ical-sync           (hourly)
/legal/privacy
/legal/terms
```

Cost guard wrapper around every LLM call: `chargeTenant(tenantId, kind, fn)` checks today's spend, calls Anthropic, records cost in `usage_events`, returns the result OR throws `BudgetExceededError`.

## Open items I'll handle inline

- Bot username (`@zarg_ai_bot`) stays for now. Rename to `@starup_ai_bot` via BotFather is a v2.1 task.
- Multilingual briefings: schema field already exists but no translation pipeline. Defer.
- Per-tenant LLM model selection: not in MVP — everyone on Sonnet for briefings, Opus for discovery.

## What success looks like at end of week 4

- 5 paying pilots, each through 30-day trial
- One of them has uploaded an Excel customer list
- At least 3 have linked an iCal calendar
- Daily briefings firing reliably
- Paylink MRR > 0 AMD
- No runaway LLM bills

## Risks I'm watching

- Paylink has no webhooks visible in the swagger — we poll `/Payment/GetPaymentByOrderId` and own retry logic. Cron must handle gracefully when Paylink is slow.
- iCal edge cases (recurring events with exceptions, all-day, multi-timezone) eat time.
- Resend DNS verification can stall on customer-side DNS configuration.
- Cost ceiling has to be tested carefully — bug here means either runaway spend or blocked briefings.

## Post-MVP agent roadmap (v3 → v5)

Decision (2026-05-18): MVP runs ONE coherent agent — the Owner agent
(discovery + self-learning + briefing + dashboard chat). No multi-agent
framework adoption. After the pilot wraps, layer additional agents
sequentially:

**v3 — Customer Agent (Telegram, EN/HY)** — 4 weeks
- Per-tenant student-facing Telegram entry point (deep-link payload
  routes the same shared bot to the right tenant)
- Booking flow: list classes, book, cancel, reschedule
- Package-balance query
- Reminder send 24h + 2h before class
- Feedback collection after class
- Armenian system prompt variant; tenant.language drives switching
- Shares the Owner agent's tenant data (same Postgres rows)

**v4 — Marketing & Sales Agent** — 3 weeks
- Weekly thematic post draft to the studio's Telegram channel
- Owner approves before send
- Themes inferred from profile + this week's data
- Per-tenant Telegram channel in tenant_integrations
- Manual Instagram caption variant (no IG API)

**v5 — Payment & Accounting Agent** — 3 weeks
- Quarterly accountant export (PDF + Excel)
- Paylink reconciliation: matches platform payments table to Paylink
  charge history, flags discrepancies
- Tax-ready statement with VAT lines if owner configures rate
- Per-payment receipt generator

Total: full four-agent product roughly month 4 from today.
