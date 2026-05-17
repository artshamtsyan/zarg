import type Anthropic from "@anthropic-ai/sdk";

// The owner narrates real events; Zarg writes them as real (owner_logged)
// rows. Names are the only identifier — the server resolves them to
// existing rows via fuzzy match when possible.

export const LEARNING_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "record_person",
    description:
      "Add a new client to the studio's people list. Use only when the owner mentions someone you haven't already recorded in this conversation. If a person is already in the studio's roster (the system will fuzzy-match by name), do NOT call this tool — bookings/payments can reference them directly.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name as the owner used it." },
        phone: { type: "string" },
        status: { type: "string", enum: ["new", "trial", "active", "paused"] },
        segment: { type: "string", description: "beginner / regular / VIP, etc." },
        notes: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "record_event",
    description:
      "Add a class / appointment / session to the studio's schedule. Provide an ISO-ish datetime relative phrasing if possible ('today 19:00', 'tomorrow 10:00'). The server resolves it to an absolute timestamp in the tenant's timezone.",
    input_schema: {
      type: "object",
      properties: {
        when: { type: "string", description: "When the event takes place — natural-language is OK ('today 19:00', 'tomorrow 8am', '2026-05-17T19:00')." },
        duration_min: { type: "integer", default: 60 },
        staff_name: { type: "string" },
        capacity: { type: "integer" },
        type: { type: "string", description: "Event vocabulary (Vinyasa, haircut, beginner Hatha)." },
        status: { type: "string", enum: ["scheduled", "completed", "cancelled"] },
      },
      required: ["when"],
    },
  },
  {
    name: "record_booking",
    description:
      "Record that someone signed up for a class. Reference the person and event by name + when. If the event doesn't exist yet, ALSO call record_event with the same `when` so the booking can attach.",
    input_schema: {
      type: "object",
      properties: {
        person_name: { type: "string" },
        event_when: { type: "string", description: "Matches the `when` you'd pass to record_event." },
        status: { type: "string", enum: ["booked", "cancelled", "waitlist"], default: "booked" },
        attendance: { type: "string", enum: ["attended", "no_show", "pending"] },
      },
      required: ["person_name", "event_when"],
    },
  },
  {
    name: "record_payment",
    description: "Record a payment the studio received.",
    input_schema: {
      type: "object",
      properties: {
        person_name: { type: "string" },
        amount_minor: { type: "integer", description: "Amount in minor units (kopeks / cents). 5000 AMD = 500000." },
        currency: { type: "string", default: "AMD" },
        method: { type: "string", enum: ["card", "cash", "transfer"], default: "cash" },
        status: { type: "string", enum: ["pending", "successful", "failed", "refunded"], default: "successful" },
        kind: { type: "string", enum: ["single", "package", "trial"], default: "single" },
        when: { type: "string", description: "When the payment landed (default: now)." },
      },
      required: ["amount_minor"],
    },
  },
];
