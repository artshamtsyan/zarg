# StarUp

Daily ops briefing for any small business — delivered via Telegram, powered by an agentic discovery, a self-learning chat, and synthetic data that fades as real data accumulates.

- Live (during pilot): https://starup.am
- Repo history: `docs/superpowers/specs/` and `docs/superpowers/plans/` — design spec from the Zarg prototype phase, the implementation plan, and the current Phase 2 MVP plan.

## Status

**Phase 2 — MVP build.** Production hardening + Excel upload + iCal sync + Stripe subscriptions, targeting 5 paying pilots in 4 weeks. See `docs/superpowers/plans/2026-05-18-phase-2-mvp-plan.md` for the week-by-week.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind v4 with the Aboard light pastel system (see `docs/design/aboard-style.md`)
- Postgres via Drizzle ORM, hosted on Neon
- NextAuth v5 (email magic links via Resend on `starup.am`)
- Anthropic SDK (Opus 4.7 for discovery + learning, Sonnet 4.6 for briefings + seed)
- Telegram Bot API via `node-telegram-bot-api` (webhook mode)
- Stripe for subscriptions (starting Week 3)
- Vercel Pro for hosting + cron

## Run locally

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL, AUTH_SECRET, ANTHROPIC_API_KEY at minimum
npm run db:migrate
npm run dev
```

Open http://localhost:3000.

## Env vars

See `.env.example`. Required for full operation:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | NextAuth session signing key (`openssl rand -base64 32`) |
| `AUTH_URL` / `APP_URL` | Public URL of the deployment |
| `RESEND_API_KEY` + `RESEND_FROM` | Magic-link email sender on starup.am |
| `ANTHROPIC_API_KEY` | Discovery, learning, briefing, seed |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET` + `TELEGRAM_BOT_USERNAME` | Daily briefing DM |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `STRIPE_PRICE_ID` | Subscriptions (Phase 2) |
| `CRON_SECRET` | Locks the cron endpoints to Vercel's scheduled invocations |

## Scripts

```bash
npm run db:migrate         # apply pending Drizzle migrations
npm run tg:webhook         # register Telegram webhook + secret
npm run tg:commands        # set /preview /pause /resume autocomplete
```
