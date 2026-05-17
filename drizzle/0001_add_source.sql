ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'synthetic' NOT NULL;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'synthetic' NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'synthetic' NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'synthetic' NOT NULL;
