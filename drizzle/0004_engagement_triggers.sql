-- Morning briefing: store the structured suggested actions so Telegram
-- can render them as tappable chips, and the webhook can look up the
-- action text when an owner taps one.
ALTER TABLE "briefings" ADD COLUMN IF NOT EXISTS "suggested_actions" jsonb;
--> statement-breakpoint

-- Distinguish morning briefing rows from evening recap rows. A tenant
-- can have one of each per day.
ALTER TABLE "briefings" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'daily';
--> statement-breakpoint

-- Replace the (tenant, for_date) unique index with (tenant, for_date, kind)
-- so morning + evening rows can coexist for the same date.
DROP INDEX IF EXISTS "briefings_tenant_date_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "briefings_tenant_date_kind_idx"
  ON "briefings" ("tenant_id", "for_date", "kind");
--> statement-breakpoint

-- Per-tenant evening recap time (default 20:00 local). Set to NULL to
-- opt out — but we keep it required and let the settings page toggle
-- via tenant status if needed.
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "evening_recap_time"
  varchar(5) NOT NULL DEFAULT '20:00';
