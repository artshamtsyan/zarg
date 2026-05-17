# Zarg

Daily ops briefing for any small business — delivered via Telegram, powered by an agentic discovery and a small synthetic data layer per tenant.

See `docs/superpowers/specs/2026-05-16-zarg-design.md` for the full design and `docs/superpowers/plans/2026-05-16-zarg-implementation-plan.md` for the build phases.

## Status

**Phase 0 — Foundation.** Landing page and design system are in. Phases 1–6 are queued (auth, discovery, seed, briefings, Telegram, dashboard).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind v4 with the "Dimension" dark command-center system (see `docs/design/dimension-style.md`)
- Postgres via Drizzle ORM
- NextAuth v5 (email magic links via Resend)
- Anthropic SDK (Opus 4.7 for discovery, Sonnet 4.6 for briefings)
- Telegram Bot API via `node-telegram-bot-api` (webhook mode)

## Run locally

```bash
pnpm install         # or npm install
cp .env.example .env.local
# fill in DATABASE_URL at minimum for Phase 1+; Phase 0 runs without it
pnpm dev
```

Open http://localhost:3000.

## Env vars

See `.env.example`. Minimums per phase:

| Phase | Required |
| --- | --- |
| 0 (landing) | none |
| 1 (auth + DB) | `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM` |
| 2 (discovery) | + `ANTHROPIC_API_KEY` |
| 3 (seed) | (same as 2) |
| 4 (briefings) | (same as 2) |
| 5 (Telegram) | + `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME`, public HTTPS URL for webhook. Run `pnpm tg:webhook` and `pnpm tg:commands` once after first deploy. |
