import type Anthropic from "@anthropic-ai/sdk";

export const DISCOVERY_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "record_profile_field",
    description:
      "Persist a single fact you've confirmed with the owner into the business profile. Use this incrementally as the conversation progresses. Each call sets one field.",
    input_schema: {
      type: "object",
      properties: {
        field: {
          type: "string",
          enum: [
            "name",
            "domain",
            "location",
            "current_state",
            "goals",
            "kpis",
            "entities",
            "constraints",
            "success_criteria",
          ],
          description:
            "Which top-level slot of the business profile to write. 'entities' is an object like { people_label, events_label } for vocabulary.",
        },
        value: {
          description:
            "The value to store. String for short facts, object for structured facts (e.g. entities, kpis as a list).",
        },
      },
      required: ["field", "value"],
    },
  },
  {
    name: "propose_workflow",
    description:
      "Add a discovered workflow to the profile's key_workflows list. Use for each distinct repeatable process the owner runs today.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short human label, e.g. 'Daily booking confirmation'." },
        trigger: { type: "string", description: "What starts the workflow." },
        steps: {
          type: "array",
          items: { type: "string" },
          description: "Ordered list of the manual steps the owner does today.",
        },
        completion: { type: "string", description: "What finishes it." },
        pain_points: {
          type: "array",
          items: { type: "string" },
          description: "What hurts about doing it manually.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "assess_automation",
    description:
      "Once you understand the workflow, classify the automation opportunity following the discovery skill criteria. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        impact: { type: "string", enum: ["low", "medium", "high"] },
        feasibility: { type: "string", enum: ["low", "medium", "high"] },
        recommendation: {
          type: "string",
          enum: [
            "High impact / high feasibility",
            "High impact / medium feasibility",
            "Medium impact / high feasibility",
            "Low priority",
            "Not suitable for full automation yet",
          ],
        },
        rationale: { type: "string", description: "One paragraph for the owner." },
      },
      required: ["impact", "feasibility", "recommendation", "rationale"],
    },
  },
  {
    name: "finalize_profile",
    description:
      "Call this when you have collected: name, domain, location, current_state, goals, entities, at least one key_workflow, and an assess_automation result. After this call the platform will seed synthetic data and the owner moves to the dashboard.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Two-sentence summary of what the owner runs and why." },
        proposed_flow: {
          type: "object",
          description: "Discovery-skill 'proposed Telegram automation flow' result.",
          properties: {
            entry: { type: "string" },
            greeting: { type: "string" },
            collection: { type: "array", items: { type: "string" } },
            validation: { type: "string" },
            routing: { type: "array", items: { type: "string" } },
            fulfillment: { type: "string" },
            confirmation: { type: "string" },
            follow_up: { type: "string" },
          },
        },
        mvp_scope: {
          type: "object",
          description: "What to build first.",
          properties: {
            includes: { type: "array", items: { type: "string" } },
            excludes: { type: "array", items: { type: "string" } },
          },
        },
        risks: {
          type: "array",
          items: { type: "string" },
          description: "Concrete risks or feasibility constraints worth flagging.",
        },
      },
      required: ["summary"],
    },
  },
];
