import { eq, asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import type { PersistedMessage } from "@/lib/ai/discovery";

export async function loadHistory(tenantId: string): Promise<PersistedMessage[]> {
  const db = getDb();
  const rows = await db
    .select({
      role: schema.discoveryMessages.role,
      content: schema.discoveryMessages.content,
      toolCalls: schema.discoveryMessages.toolCalls,
    })
    .from(schema.discoveryMessages)
    .where(eq(schema.discoveryMessages.tenantId, tenantId))
    .orderBy(asc(schema.discoveryMessages.createdAt));
  return rows.map((r) => ({
    role: r.role as PersistedMessage["role"],
    content: r.content,
    toolCalls: r.toolCalls ?? undefined,
  }));
}

export async function appendMessage(tenantId: string, msg: PersistedMessage) {
  const db = getDb();
  await db.insert(schema.discoveryMessages).values({
    tenantId,
    role: msg.role,
    content: msg.content,
    toolCalls: msg.toolCalls ?? null,
  });
}

export async function loadProfile(tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.businessProfiles)
    .where(eq(schema.businessProfiles.tenantId, tenantId))
    .limit(1);
  return row ?? null;
}

interface ProfileFieldUpdate {
  field: string;
  value: unknown;
}

const SCALAR_FIELDS = new Set(["name", "domain", "location"]);

export async function applyProfileField(tenantId: string, update: ProfileFieldUpdate) {
  const db = getDb();
  if (SCALAR_FIELDS.has(update.field)) {
    // name/domain/location live on tenants, not business_profiles
    const value = typeof update.value === "string" ? update.value : JSON.stringify(update.value);
    if (update.field === "name") {
      await db
        .update(schema.tenants)
        .set({ name: value })
        .where(eq(schema.tenants.id, tenantId));
    } else if (update.field === "domain") {
      await db
        .update(schema.tenants)
        .set({ domain: value })
        .where(eq(schema.tenants.id, tenantId));
    } else if (update.field === "location") {
      await db
        .update(schema.tenants)
        .set({ location: value })
        .where(eq(schema.tenants.id, tenantId));
    }
    return;
  }
  if (update.field === "current_state") {
    await db
      .update(schema.businessProfiles)
      .set({ currentState: update.value as object })
      .where(eq(schema.businessProfiles.tenantId, tenantId));
    return;
  }
  if (update.field === "goals") {
    await db
      .update(schema.businessProfiles)
      .set({ goals: update.value as object })
      .where(eq(schema.businessProfiles.tenantId, tenantId));
    return;
  }
  if (update.field === "kpis") {
    await db
      .update(schema.businessProfiles)
      .set({ kpis: update.value as object })
      .where(eq(schema.businessProfiles.tenantId, tenantId));
    return;
  }
  if (update.field === "entities") {
    await db
      .update(schema.businessProfiles)
      .set({ entities: update.value as object })
      .where(eq(schema.businessProfiles.tenantId, tenantId));
    return;
  }
  // Unknown field — drop into current_state as a sub-key for safety.
  const existing = await loadProfile(tenantId);
  const merged = { ...((existing?.currentState as object) ?? {}), [update.field]: update.value };
  await db
    .update(schema.businessProfiles)
    .set({ currentState: merged })
    .where(eq(schema.businessProfiles.tenantId, tenantId));
}

export async function appendWorkflow(
  tenantId: string,
  workflow: Record<string, unknown>
) {
  const db = getDb();
  const existing = await loadProfile(tenantId);
  const list = Array.isArray(existing?.keyWorkflows) ? (existing.keyWorkflows as unknown[]) : [];
  await db
    .update(schema.businessProfiles)
    .set({ keyWorkflows: [...list, workflow] })
    .where(eq(schema.businessProfiles.tenantId, tenantId));
}

export async function setAssessment(tenantId: string, assessment: Record<string, unknown>) {
  const db = getDb();
  await db
    .update(schema.businessProfiles)
    .set({ proposedFlow: { assessment } })
    .where(eq(schema.businessProfiles.tenantId, tenantId));
}

export async function setFinalization(
  tenantId: string,
  finalization: Record<string, unknown>
) {
  const db = getDb();
  await db
    .update(schema.businessProfiles)
    .set({
      proposedFlow: finalization.proposed_flow ?? {},
      mvpScope: finalization.mvp_scope ?? {},
      risks: { items: finalization.risks ?? [] },
      currentState: { summary: finalization.summary ?? "", ...((finalization.summary && {}) || {}) },
    })
    .where(eq(schema.businessProfiles.tenantId, tenantId));
}
