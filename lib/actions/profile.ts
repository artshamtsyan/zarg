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
  eveningRecapTime?: string;
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
  if (input.eveningRecapTime !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.eveningRecapTime)) {
      return { ok: false, error: "Evening recap time must be HH:MM (24h)" };
    }
    next.eveningRecapTime = input.eveningRecapTime;
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

// ─── Plain-text editor (non-technical owners shouldn't see JSON) ────────

interface ProfileTextSlot {
  field: JsonbField;
  /** How to shape the input text into jsonb */
  shape: "summary" | "items" | "people_label" | "events_label";
}

const PLAIN_SLOTS: Record<string, ProfileTextSlot> = {
  business_summary: { field: "currentState", shape: "summary" },
  goals: { field: "goals", shape: "items" },
  kpis: { field: "kpis", shape: "items" },
  workflows: { field: "keyWorkflows", shape: "items" },
  risks: { field: "risks", shape: "items" },
  people_label: { field: "entities", shape: "people_label" },
  events_label: { field: "entities", shape: "events_label" },
};

function isPlainSlot(name: string): name is keyof typeof PLAIN_SLOTS {
  return Object.prototype.hasOwnProperty.call(PLAIN_SLOTS, name);
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export async function updateProfilePlainText(
  slot: string,
  text: string
): Promise<UpdateResult> {
  const session = await auth();
  if (!session?.user?.tenantId) return { ok: false, error: "Not signed in" };
  if (!isPlainSlot(slot)) return { ok: false, error: `Unknown slot: ${slot}` };

  const slotDef = PLAIN_SLOTS[slot];
  const trimmed = (text ?? "").trim();
  const db = getDb();

  // Load current value for the target jsonb field so we can merge instead
  // of clobbering sibling sub-keys.
  const [existing] = await db
    .select()
    .from(schema.businessProfiles)
    .where(eq(schema.businessProfiles.tenantId, session.user.tenantId))
    .limit(1);

  let next: object;
  if (slotDef.field === "keyWorkflows") {
    // Workflows are an array — store text lines as { name, summary } objects.
    const items = trimmed
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-*•·]\s*/, "").trim())
      .filter(Boolean);
    next = items.map((line) => ({ name: line.slice(0, 80), summary: line }));
  } else {
    const current = asObject(existing?.[slotDef.field as keyof typeof existing]);
    if (slotDef.shape === "summary") {
      next = { ...current, summary: trimmed };
    } else if (slotDef.shape === "items") {
      const items = trimmed
        .split(/\r?\n/)
        .map((l) => l.replace(/^[-*•·]\s*/, "").trim())
        .filter(Boolean);
      next = { ...current, items };
    } else if (slotDef.shape === "people_label") {
      next = { ...current, people_label: trimmed.slice(0, 60) };
    } else {
      next = { ...current, events_label: trimmed.slice(0, 60) };
    }
  }

  await db
    .update(schema.businessProfiles)
    .set({ [slotDef.field]: next, updatedAt: new Date() } as Partial<
      typeof schema.businessProfiles.$inferInsert
    >)
    .where(eq(schema.businessProfiles.tenantId, session.user.tenantId));

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Reader helper lives in lib/profile-text.ts (sync function — can't live
// in a "use server" module).

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
