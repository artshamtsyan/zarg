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

// Normalize a value for a jsonb column. Wrap plain strings so they survive
// later merges without being spread-as-array.
function normalizeJsonbValue(field: string, value: unknown): object {
  if (typeof value === "string") {
    if (field === "goals" || field === "kpis") return { summary: value };
    return { summary: value };
  }
  if (Array.isArray(value)) {
    return { items: value };
  }
  if (value && typeof value === "object") return value as object;
  return { value };
}

function safeObject(maybe: unknown): Record<string, unknown> {
  if (maybe && typeof maybe === "object" && !Array.isArray(maybe)) {
    return maybe as Record<string, unknown>;
  }
  return {};
}

export async function applyProfileField(tenantId: string, update: ProfileFieldUpdate) {
  const db = getDb();
  if (SCALAR_FIELDS.has(update.field)) {
    // name/domain/location live on tenants, not business_profiles
    const value =
      typeof update.value === "string" ? update.value : JSON.stringify(update.value);
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
      .set({ currentState: normalizeJsonbValue("current_state", update.value) })
      .where(eq(schema.businessProfiles.tenantId, tenantId));
    return;
  }
  if (update.field === "goals") {
    await db
      .update(schema.businessProfiles)
      .set({ goals: normalizeJsonbValue("goals", update.value) })
      .where(eq(schema.businessProfiles.tenantId, tenantId));
    return;
  }
  if (update.field === "kpis") {
    await db
      .update(schema.businessProfiles)
      .set({ kpis: normalizeJsonbValue("kpis", update.value) })
      .where(eq(schema.businessProfiles.tenantId, tenantId));
    return;
  }
  if (update.field === "entities") {
    await db
      .update(schema.businessProfiles)
      .set({ entities: normalizeJsonbValue("entities", update.value) })
      .where(eq(schema.businessProfiles.tenantId, tenantId));
    return;
  }
  // Unknown field — drop into current_state as a sub-key for safety.
  // CRITICAL: only spread the existing value if it's already an object;
  // otherwise we'd spread a string and produce per-character numeric keys.
  const existing = await loadProfile(tenantId);
  const existingObj = safeObject(existing?.currentState);
  const merged = { ...existingObj, [update.field]: update.value };
  await db
    .update(schema.businessProfiles)
    .set({ currentState: merged })
    .where(eq(schema.businessProfiles.tenantId, tenantId));
}

// Normalize a workflow name for similarity comparison.
function workflowKey(wf: Record<string, unknown>): string {
  const name = typeof wf.name === "string" ? wf.name : "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_WORKFLOWS = 4;

export async function appendWorkflow(
  tenantId: string,
  workflow: Record<string, unknown>
) {
  const db = getDb();
  const existing = await loadProfile(tenantId);
  const list = Array.isArray(existing?.keyWorkflows)
    ? (existing.keyWorkflows as Array<Record<string, unknown>>)
    : [];

  const incomingKey = workflowKey(workflow);

  // Hard cap so the model can't fill the profile with near-duplicates.
  if (list.length >= MAX_WORKFLOWS) return;

  // Replace if a near-duplicate already exists; append otherwise.
  const existingIdx = list.findIndex((w) => workflowKey(w) === incomingKey);
  let next: Array<Record<string, unknown>>;
  if (existingIdx >= 0) {
    next = list.slice();
    next[existingIdx] = workflow;
  } else {
    next = [...list, workflow];
  }

  await db
    .update(schema.businessProfiles)
    .set({ keyWorkflows: next })
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
