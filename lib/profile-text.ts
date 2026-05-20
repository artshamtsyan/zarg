// Read a business_profiles row's jsonb fields back as plain text, the
// inverse of updateProfilePlainText (which lives in lib/actions/profile.ts).
// Kept separate so it can be imported in server components without dragging
// the "use server" boundary.

import type { schema } from "@/lib/db/client";

interface PlainSlot {
  field: "currentState" | "goals" | "kpis" | "entities" | "keyWorkflows" | "proposedFlow" | "mvpScope" | "risks";
  shape: "summary" | "items" | "people_label" | "events_label";
}

const PLAIN_SLOTS: Record<string, PlainSlot> = {
  business_summary: { field: "currentState", shape: "summary" },
  goals: { field: "goals", shape: "items" },
  kpis: { field: "kpis", shape: "items" },
  workflows: { field: "keyWorkflows", shape: "items" },
  risks: { field: "risks", shape: "items" },
  people_label: { field: "entities", shape: "people_label" },
  events_label: { field: "entities", shape: "events_label" },
};

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

type BusinessProfileRow = typeof schema.businessProfiles.$inferSelect;

export function readProfilePlainText(slot: string, profile: BusinessProfileRow | null): string {
  if (!profile) return "";
  const slotDef = PLAIN_SLOTS[slot];
  if (!slotDef) return "";

  if (slotDef.field === "keyWorkflows") {
    const arr = Array.isArray(profile.keyWorkflows) ? profile.keyWorkflows : [];
    return (arr as Array<Record<string, unknown>>)
      .map((wf) => {
        if (typeof wf.summary === "string") return wf.summary;
        if (typeof wf.name === "string") return wf.name;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  const value = profile[slotDef.field as keyof BusinessProfileRow] as unknown;
  const o = asObject(value);
  if (slotDef.shape === "summary") return (o.summary as string) ?? "";
  if (slotDef.shape === "items") {
    const items = Array.isArray(o.items) ? (o.items as unknown[]) : [];
    return items.map((i) => (typeof i === "string" ? i : JSON.stringify(i))).join("\n");
  }
  if (slotDef.shape === "people_label") return (o.people_label as string) ?? "";
  if (slotDef.shape === "events_label") return (o.events_label as string) ?? "";
  return "";
}
