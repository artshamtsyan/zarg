"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";

type TenantStatus = "onboarding" | "active" | "paused";

export interface UpdateResult {
  ok: boolean;
  error?: string;
}

// ─── Tenant scalars (name, domain, location, timezone, briefing_local_time, language) ──

export interface TenantUpdate {
  name?: string;
  domain?: string;
  location?: string;
  timezone?: string;
  briefingLocalTime?: string;
  language?: string;
}

export async function updateTenant(input: TenantUpdate): Promise<UpdateResult> {
  const session = await auth();
  if (!session?.user?.tenantId) return { ok: false, error: "Not signed in" };

  const next: Partial<typeof schema.tenants.$inferInsert> = {};
  if (input.name !== undefined) {
    const v = input.name.trim();
    if (v.length === 0 || v.length > 120) return { ok: false, error: "Business name 1-120 chars" };
    next.name = v;
  }
  if (input.domain !== undefined) {
    next.domain = input.domain.trim().slice(0, 60) || "other";
  }
  if (input.location !== undefined) {
    next.location = input.location.trim().slice(0, 120) || null;
  }
  if (input.timezone !== undefined) {
    const v = input.timezone.trim();
    if (v.length === 0 || v.length > 64) return { ok: false, error: "Timezone required" };
    next.timezone = v;
  }
  if (input.briefingLocalTime !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.briefingLocalTime)) {
      return { ok: false, error: "Briefing time must be HH:MM (24h)" };
    }
    next.briefingLocalTime = input.briefingLocalTime;
  }
  if (input.language !== undefined) {
    next.language = input.language.trim().slice(0, 8) || "en";
  }

  if (Object.keys(next).length === 0) return { ok: true };

  const db = getDb();
  await db.update(schema.tenants).set(next).where(eq(schema.tenants.id, session.user.tenantId));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/profile");
  return { ok: true };
}

// ─── Business profile jsonb fields ───────────────────────────────

const JSONB_FIELDS = ["currentState", "goals", "kpis", "entities", "keyWorkflows", "proposedFlow", "mvpScope", "risks"] as const;
type JsonbField = (typeof JSONB_FIELDS)[number];

function isJsonbField(field: string): field is JsonbField {
  return (JSONB_FIELDS as readonly string[]).includes(field);
}

export async function updateProfileField(
  field: string,
  jsonText: string
): Promise<UpdateResult> {
  const session = await auth();
  if (!session?.user?.tenantId) return { ok: false, error: "Not signed in" };
  if (!isJsonbField(field)) return { ok: false, error: `Unknown field: ${field}` };

  let value: unknown;
  try {
    value = JSON.parse(jsonText);
  } catch (err) {
    return {
      ok: false,
      error: `Invalid JSON: ${err instanceof Error ? err.message : "parse error"}`,
    };
  }

  const db = getDb();
  await db
    .update(schema.businessProfiles)
    .set({ [field]: value, updatedAt: new Date() } as Partial<typeof schema.businessProfiles.$inferInsert>)
    .where(eq(schema.businessProfiles.tenantId, session.user.tenantId));

  revalidatePath("/dashboard/profile");
  return { ok: true };
}

// ─── Pause / resume helpers (settings page reuses Telegram action's logic) ──

export async function setTenantStatusViaProfile(status: TenantStatus): Promise<UpdateResult> {
  const session = await auth();
  if (!session?.user?.tenantId) return { ok: false, error: "Not signed in" };
  const db = getDb();
  await db
    .update(schema.tenants)
    .set({ status })
    .where(eq(schema.tenants.id, session.user.tenantId));
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
