// Pull the tenant's own vocabulary out of their business_profiles row so
// the UI says "students" / "classes" for a yoga studio, "clients" /
// "appointments" for a salon, "students" / "sessions" for tutoring, etc.
//
// All vocabulary mappings live here. The discovery agent already records
// these into `business_profiles.entities` (the {events_label, people_label}
// object). When that's missing or partial, we fall back by domain.

import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";

export interface TenantVocab {
  /** "student" / "client" / "patient" — singular form */
  person: string;
  /** "students" / "clients" — plural form */
  people: string;
  /** "class" / "appointment" / "session" — singular */
  event: string;
  /** "classes" / "appointments" / "sessions" — plural */
  events: string;
  /** Whether the source comes from the tenant's real discovery profile */
  fromProfile: boolean;
}

const DEFAULTS_BY_DOMAIN: Record<string, Partial<TenantVocab>> = {
  yoga: { person: "student", people: "students", event: "class", events: "classes" },
  fitness: { person: "client", people: "clients", event: "class", events: "classes" },
  salon: {
    person: "client",
    people: "clients",
    event: "appointment",
    events: "appointments",
  },
  hair: { person: "client", people: "clients", event: "appointment", events: "appointments" },
  beauty: { person: "client", people: "clients", event: "appointment", events: "appointments" },
  tutoring: { person: "student", people: "students", event: "session", events: "sessions" },
  education: { person: "student", people: "students", event: "session", events: "sessions" },
  clinic: { person: "patient", people: "patients", event: "visit", events: "visits" },
  medical: { person: "patient", people: "patients", event: "visit", events: "visits" },
  therapy: { person: "client", people: "clients", event: "session", events: "sessions" },
  coaching: { person: "client", people: "clients", event: "session", events: "sessions" },
};

const GENERIC: TenantVocab = {
  person: "customer",
  people: "customers",
  event: "appointment",
  events: "appointments",
  fromProfile: false,
};

function singularize(plural: string | undefined): string | undefined {
  if (!plural) return undefined;
  const p = plural.trim();
  if (!p) return undefined;
  if (p.endsWith("ies")) return p.slice(0, -3) + "y";
  if (p.endsWith("es") && (p.endsWith("sses") || p.endsWith("shes") || p.endsWith("ches")))
    return p.slice(0, -2);
  if (p.endsWith("s") && !p.endsWith("ss")) return p.slice(0, -1);
  return p;
}

function pluralize(singular: string | undefined): string | undefined {
  if (!singular) return undefined;
  const s = singular.trim();
  if (!s) return undefined;
  if (s.endsWith("y") && !/[aeiou]y$/.test(s)) return s.slice(0, -1) + "ies";
  if (s.endsWith("s") || s.endsWith("x") || s.endsWith("z") || s.endsWith("sh") || s.endsWith("ch"))
    return s + "es";
  return s + "s";
}

/** Synchronous version — pass an entities jsonb value + a domain hint. */
export function vocabFromProfile(
  entities: unknown,
  domain: string | null | undefined
): TenantVocab {
  let peopleLabel: string | undefined;
  let eventsLabel: string | undefined;
  if (entities && typeof entities === "object" && !Array.isArray(entities)) {
    const o = entities as Record<string, unknown>;
    if (typeof o.people_label === "string") peopleLabel = o.people_label;
    if (typeof o.events_label === "string") eventsLabel = o.events_label;
  }

  const domainKey = (domain ?? "").toLowerCase();
  const domainDefaults: Partial<TenantVocab> = {};
  for (const key of Object.keys(DEFAULTS_BY_DOMAIN)) {
    if (domainKey.includes(key)) {
      Object.assign(domainDefaults, DEFAULTS_BY_DOMAIN[key]);
      break;
    }
  }

  const people = peopleLabel ?? domainDefaults.people ?? GENERIC.people;
  const person = singularize(people) ?? domainDefaults.person ?? GENERIC.person;
  const events = eventsLabel ?? domainDefaults.events ?? GENERIC.events;
  const event = singularize(events) ?? domainDefaults.event ?? GENERIC.event;

  return {
    person,
    people,
    event,
    events,
    fromProfile: Boolean(peopleLabel || eventsLabel),
  };
}

/** Async version — looks up the tenant's profile and domain itself. */
export async function vocabFor(tenantId: string): Promise<TenantVocab> {
  const db = getDb();
  const [profile] = await db
    .select({ entities: schema.businessProfiles.entities })
    .from(schema.businessProfiles)
    .where(eq(schema.businessProfiles.tenantId, tenantId))
    .limit(1);
  const [tenant] = await db
    .select({ domain: schema.tenants.domain })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);
  return vocabFromProfile(profile?.entities, tenant?.domain ?? null);
}

/** Tiny helper — capitalize the first letter for headers. */
export function cap(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

void pluralize; // keep export hook open for callers needing it
