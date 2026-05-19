CREATE TABLE IF NOT EXISTS "tenant_integrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "last_sync_at" timestamp,
  "last_error" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tenant_integrations" ADD CONSTRAINT "tenant_integrations_tenant_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_integrations_tenant_kind_idx"
  ON "tenant_integrations" ("tenant_id", "kind");
