import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./anthropic";
import { env } from "@/lib/env";

// ─── Output schema (validated post-LLM) ──────────────────────────────────────

const personSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().max(40).optional(),
  status: z.enum(["new", "trial", "active", "paused"]),
  segment: z.string().max(60).optional(),
  notes: z.string().max(240).optional(),
  joined_days_ago: z.number().int().min(0).max(720),
});

const eventSchema = z.object({
  start_offset_hours: z.number().int().min(-720).max(720), // -30d to +30d
  duration_min: z.number().int().min(10).max(360).default(60),
  staff_name: z.string().min(1).max(80),
  capacity: z.number().int().min(1).max(60).default(12),
  type: z.string().max(60).optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
});

const bookingSchema = z.object({
  person_index: z.number().int().min(0),
  event_index: z.number().int().min(0),
  status: z.enum(["booked", "cancelled", "waitlist"]).default("booked"),
  attendance: z.enum(["attended", "no_show", "pending"]).optional(),
});

const paymentSchema = z.object({
  person_index: z.number().int().min(0).optional(),
  amount_minor: z.number().int().min(0).max(10_000_000),
  currency: z.string().length(3).default("AMD"),
  method: z.enum(["card", "cash", "transfer"]).default("card"),
  status: z.enum(["pending", "successful", "failed", "refunded"]).default("successful"),
  ref: z.string().max(60).optional(),
  paid_offset_hours: z.number().int().min(-720).max(48),
  kind: z.enum(["single", "package", "trial"]).default("single"),
});

const packageSchema = z.object({
  person_index: z.number().int().min(0),
  kind: z.string().min(1).max(60),
  visits_total: z.number().int().min(1).max(40),
  visits_remaining: z.number().int().min(0).max(40),
  started_days_ago: z.number().int().min(0).max(180),
  expires_days_from_now: z.number().int().min(-30).max(180).optional(),
  status: z.enum(["active", "expired", "paused"]).default("active"),
});

export const seedSchema = z.object({
  people: z.array(personSchema).min(5).max(60),
  events: z.array(eventSchema).min(10).max(80),
  bookings: z.array(bookingSchema).max(300),
  payments: z.array(paymentSchema).max(200),
  packages: z.array(packageSchema).max(60),
});

export type SeedPayload = z.infer<typeof seedSchema>;

// ─── Anthropic tool spec (parallel to the Zod schema) ────────────────────────

const SEED_TOOL: Anthropic.Messages.Tool = {
  name: "emit_seed_data",
  description:
    "Emit a realistic 4-week operational dataset for this tenant. Reference people and events by their position in the arrays (person_index, event_index).",
  input_schema: {
    type: "object",
    properties: {
      people: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            phone: { type: "string" },
            status: { type: "string", enum: ["new", "trial", "active", "paused"] },
            segment: { type: "string", description: "level or category, e.g. beginner / regular / VIP" },
            notes: { type: "string" },
            joined_days_ago: { type: "integer", minimum: 0, maximum: 720 },
          },
          required: ["name", "status", "joined_days_ago"],
        },
      },
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            start_offset_hours: { type: "integer", description: "Negative = past, positive = future. Range -720..720." },
            duration_min: { type: "integer" },
            staff_name: { type: "string" },
            capacity: { type: "integer" },
            type: { type: "string", description: "event type — class style, service name, etc." },
            status: { type: "string", enum: ["scheduled", "completed", "cancelled"] },
          },
          required: ["start_offset_hours", "staff_name"],
        },
      },
      bookings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            person_index: { type: "integer" },
            event_index: { type: "integer" },
            status: { type: "string", enum: ["booked", "cancelled", "waitlist"] },
            attendance: { type: "string", enum: ["attended", "no_show", "pending"] },
          },
          required: ["person_index", "event_index"],
        },
      },
      payments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            person_index: { type: "integer" },
            amount_minor: { type: "integer", description: "Amount in minor units (kopeks / cents)." },
            currency: { type: "string", description: "ISO 4217, e.g. AMD, USD" },
            method: { type: "string", enum: ["card", "cash", "transfer"] },
            status: { type: "string", enum: ["pending", "successful", "failed", "refunded"] },
            ref: { type: "string" },
            paid_offset_hours: { type: "integer" },
            kind: { type: "string", enum: ["single", "package", "trial"] },
          },
          required: ["amount_minor", "paid_offset_hours"],
        },
      },
      packages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            person_index: { type: "integer" },
            kind: { type: "string" },
            visits_total: { type: "integer" },
            visits_remaining: { type: "integer" },
            started_days_ago: { type: "integer" },
            expires_days_from_now: { type: "integer" },
            status: { type: "string", enum: ["active", "expired", "paused"] },
          },
          required: ["person_index", "kind", "visits_total", "visits_remaining", "started_days_ago"],
        },
      },
    },
    required: ["people", "events", "bookings", "payments", "packages"],
  },
};

// ─── Generator ───────────────────────────────────────────────────────────────

interface BuildArgs {
  tenant: {
    name: string;
    domain: string;
    location: string | null;
  };
  profile: {
    entities?: unknown;
    goals?: unknown;
    keyWorkflows?: unknown;
  };
}

const SEED_SYSTEM = `You generate compact, realistic synthetic operational datasets for small businesses. Output must fit within strict token limits — keep notes/fields short.

Mandatory volumes (don't skip any array — ALL FIVE must be present, even with default attendance/status values):
- 15-20 people
- 25-35 events (mix of past 2 weeks marked completed and next 2 weeks marked scheduled)
- 60-120 bookings (most past events get 5-10 bookings; some future events get 3-6)
- 10-15 payments (mostly successful, 1-2 pending, 1 refunded)
- 10-14 packages (about 60% of active people get one)

Rules:
- Use locale-appropriate names (Armenian / Russian / English mix in Armenia).
- Keep \`notes\` empty unless really helpful; keep \`segment\` to one word.
- For event \`type\`, use vocabulary from the profile (yoga classes for a yoga studio, appointments for a salon, etc.).
- Currency: AMD for Armenia, otherwise pick a sensible local currency.
- Always emit emit_seed_data as a tool call with all five arrays populated. Don't write any prose.`;

function buildUserPrompt(args: BuildArgs): string {
  const { tenant, profile } = args;
  return `Tenant: ${tenant.name}
Domain: ${tenant.domain}
Location: ${tenant.location ?? "Armenia"}

Profile vocabulary (entities): ${JSON.stringify(profile.entities ?? {}, null, 2)}
Goals: ${JSON.stringify(profile.goals ?? {}, null, 2)}
Key workflows: ${JSON.stringify(profile.keyWorkflows ?? [], null, 2)}

Generate the 4-week seed dataset for this tenant. Reference people and events by their position index in the arrays.`;
}

async function generateRaw(args: BuildArgs): Promise<unknown> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: env.briefingModel(),
    max_tokens: 16000,
    system: SEED_SYSTEM,
    tools: [SEED_TOOL],
    tool_choice: { type: "tool", name: "emit_seed_data" },
    messages: [{ role: "user", content: buildUserPrompt(args) }],
  });
  for (const block of res.content) {
    if (block.type === "tool_use" && block.name === "emit_seed_data") {
      return block.input;
    }
  }
  throw new Error("Seed generation: model did not call emit_seed_data");
}

export interface SeedResult {
  payload: SeedPayload;
  source: "llm" | "fallback";
}

export async function generateSeed(args: BuildArgs): Promise<SeedResult> {
  if (!env.hasAnthropic()) {
    return { payload: fallbackSeed(args), source: "fallback" };
  }
  try {
    const raw = await generateRaw(args);
    const parsed = seedSchema.safeParse(raw);
    if (parsed.success) {
      return { payload: parsed.data, source: "llm" };
    }
    console.warn("[seed] first validation failed, retrying once", parsed.error.issues.slice(0, 3));
    // Retry once with looser expectations — Zod parser uses defaults so most
    // missing optional fields are forgiven already; if it still fails, fall back.
    const raw2 = await generateRaw(args);
    const parsed2 = seedSchema.safeParse(raw2);
    if (parsed2.success) {
      return { payload: parsed2.data, source: "llm" };
    }
    console.warn("[seed] second validation failed, using fallback", parsed2.error.issues.slice(0, 3));
  } catch (err) {
    console.warn("[seed] LLM call failed, using fallback:", err instanceof Error ? err.message : err);
  }
  return { payload: fallbackSeed(args), source: "fallback" };
}

// ─── Procedural fallback (Faker) ─────────────────────────────────────────────

import { faker } from "@faker-js/faker";

function fallbackSeed({ profile }: BuildArgs): SeedPayload {
  const fk = faker;
  const entities = (profile.entities as { events_label?: string; people_label?: string } | undefined) ?? {};
  const eventLabel = entities.events_label ?? "session";

  const peopleCount = 22;
  const people: SeedPayload["people"] = Array.from({ length: peopleCount }, () => {
    const status = fk.helpers.weightedArrayElement([
      { weight: 7, value: "active" as const },
      { weight: 2, value: "trial" as const },
      { weight: 1, value: "paused" as const },
      { weight: 1, value: "new" as const },
    ]);
    return {
      name: fk.person.fullName(),
      phone: fk.phone.number(),
      status,
      segment: fk.helpers.arrayElement(["beginner", "regular", "advanced", "VIP"]),
      notes: undefined,
      joined_days_ago: fk.number.int({ min: 1, max: 365 }),
    };
  });

  const staffPool = Array.from({ length: 4 }, () => fk.person.firstName());

  const events: SeedPayload["events"] = [];
  // Past 2 weeks (completed) and next 2 weeks (scheduled), ~3-4 events per day
  for (let day = -14; day <= 14; day++) {
    const eventsToday = fk.number.int({ min: 2, max: 4 });
    for (let i = 0; i < eventsToday; i++) {
      const hour = fk.helpers.arrayElement([8, 10, 12, 17, 19]);
      const start_offset_hours = day * 24 + hour;
      events.push({
        start_offset_hours,
        duration_min: 60,
        staff_name: fk.helpers.arrayElement(staffPool),
        capacity: 12,
        type: eventLabel,
        status: day < 0 ? "completed" : "scheduled",
      });
    }
  }

  const bookings: SeedPayload["bookings"] = [];
  for (let e = 0; e < events.length; e++) {
    const evt = events[e];
    const bookingCount = fk.number.int({ min: 4, max: Math.min(12, evt.capacity) });
    const chosen = fk.helpers.arrayElements(
      Array.from({ length: peopleCount }, (_, i) => i),
      bookingCount
    );
    for (const personIdx of chosen) {
      const past = evt.start_offset_hours < 0;
      bookings.push({
        person_index: personIdx,
        event_index: e,
        status: "booked",
        attendance: past
          ? fk.helpers.weightedArrayElement([
              { weight: 8, value: "attended" as const },
              { weight: 1, value: "no_show" as const },
            ])
          : "pending",
      });
    }
  }

  const payments: SeedPayload["payments"] = Array.from({ length: 18 }, () => ({
    person_index: fk.number.int({ min: 0, max: peopleCount - 1 }),
    amount_minor: fk.helpers.arrayElement([2500_00, 4000_00, 20000_00, 38000_00]),
    currency: "AMD",
    method: fk.helpers.arrayElement(["card", "cash"]) as "card" | "cash",
    status: fk.helpers.weightedArrayElement([
      { weight: 15, value: "successful" as const },
      { weight: 2, value: "pending" as const },
      { weight: 1, value: "refunded" as const },
    ]),
    paid_offset_hours: -fk.number.int({ min: 1, max: 14 * 24 }),
    kind: fk.helpers.arrayElement(["single", "package", "trial"]) as "single" | "package" | "trial",
  }));

  const packages: SeedPayload["packages"] = Array.from(
    { length: Math.floor(peopleCount * 0.6) },
    (_, i) => {
      const total = 8;
      return {
        person_index: i,
        kind: "8-class",
        visits_total: total,
        visits_remaining: fk.number.int({ min: 0, max: total }),
        started_days_ago: fk.number.int({ min: 1, max: 25 }),
        expires_days_from_now: fk.number.int({ min: 1, max: 30 }),
        status: "active" as const,
      };
    }
  );

  return seedSchema.parse({ people, events, bookings, payments, packages });
}
