import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./anthropic";
import { DISCOVERY_TOOLS } from "./discovery-tools";
import { DISCOVERY_SKILL } from "./discovery-skill";
import { env } from "@/lib/env";

function getDiscoverySkill(): string {
  return DISCOVERY_SKILL;
}

const SYSTEM_PREAMBLE = `You are Zarg's discovery agent. You are talking to a small-business owner who just signed up.

Your goal is to run a SHORT, high-signal conversation (target 6-8 turns total — never more than 10) and end by calling finalize_profile.

Strict rules:
- Ask ONE focused question per turn. Batch closely related sub-questions naturally; do not ask 3 separate questions in one turn.
- Whenever the owner confirms a fact, call record_profile_field for it in the SAME turn.
- Call propose_workflow AT MOST TWICE in the entire conversation. Once you've captured one workflow (the main one), do NOT propose it again with refined wording. Move on.
- After you understand the main workflow and the goals, call assess_automation exactly once.
- When you have ALL of these — name, domain, location, current_state, goals, entities vocabulary, at least one workflow, and an assess_automation — call finalize_profile in your NEXT turn and STOP. Do not ask further questions once you have enough; just finalize.
- If you've already asked 6 turns and have most fields, FINALIZE on turn 7 even if some optional fields are missing.
- Field-value contracts: when you call record_profile_field with one of these fields, pass the value as an OBJECT (never a plain string):
    • current_state: { summary: "..." } and optionally { schedule, pricing, staff, ... }
    • goals: { primary: "...", secondary: [...] } or { items: ["..."] }
    • kpis: { items: ["..."] }
    • entities: { events_label: "classes", people_label: "students" }
  For "name", "domain", "location" pass a plain short string. For "constraints" and "success_criteria" pass a short string or { items: [...] }.
- Default location is Armenia unless the owner says otherwise.
- Always offer 2-4 short quick-reply chips. Each chip is its OWN <quick>...</quick> block on its own line at the very end of your message, 1-6 words. Never put multiple chips in one block.
- Tone: warm, plain, practical. Short sentences. No corporate filler.

The full discovery skill below is your methodology reference. Follow it but stay within the turn budget.`;

export interface PersistedMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: unknown;
}

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: Anthropic.Messages.MessageParam["content"];
}

export function buildSystemBlocks(): Anthropic.Messages.MessageCreateParams["system"] {
  // cache_control is supported by the API for the discovery skill block, but
  // the SDK's TextBlockParam type doesn't surface it. Cast through to keep
  // strict types happy without losing the cache hint at runtime.
  return [
    { type: "text", text: SYSTEM_PREAMBLE },
    {
      type: "text",
      text: getDiscoverySkill(),
      cache_control: { type: "ephemeral" },
    } as unknown as { type: "text"; text: string },
  ];
}

interface BuildMessagesArgs {
  tenantName: string;
  ownerName: string | null;
  history: PersistedMessage[];
  userTurn: string;
}

interface StoredToolCall {
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export function buildMessages({
  tenantName,
  ownerName,
  history,
  userTurn,
}: BuildMessagesArgs): Anthropic.Messages.MessageParam[] {
  const messages: Anthropic.Messages.MessageParam[] = [];

  if (history.length === 0) {
    const greetingHint = ownerName
      ? `The owner's name is ${ownerName}. The business they just registered is "${tenantName}".`
      : `The business they just registered is "${tenantName}".`;
    messages.push({
      role: "user",
      content: `${greetingHint}\n\nGreet them warmly by name, then ask the first discovery question.`,
    });
    return messages;
  }

  for (const m of history) {
    if (m.role === "tool") continue;

    if (m.role === "user") {
      messages.push({ role: "user", content: m.content });
      continue;
    }

    // assistant turn — preserve text AND any tool_use blocks the model
    // emitted last time, so it doesn't re-invent them every turn.
    const toolCalls = Array.isArray(m.toolCalls)
      ? (m.toolCalls as StoredToolCall[]).filter((t) => t.id && t.name)
      : [];

    type AssistantBlock =
      | { type: "text"; text: string }
      | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

    const assistantContent: AssistantBlock[] = [];
    if (m.content && m.content.trim().length > 0) {
      assistantContent.push({ type: "text", text: m.content });
    }
    for (const t of toolCalls) {
      assistantContent.push({
        type: "tool_use",
        id: t.id!,
        name: t.name!,
        input: t.input ?? {},
      });
    }
    if (assistantContent.length === 0) continue;
    messages.push({
      role: "assistant",
      content: assistantContent as unknown as Anthropic.Messages.MessageParam["content"],
    });

    // Pair every tool_use with a synthetic tool_result so the model sees
    // the call as completed and doesn't try to re-run it.
    if (toolCalls.length > 0) {
      messages.push({
        role: "user",
        content: toolCalls.map((t) => ({
          type: "tool_result" as const,
          tool_use_id: t.id!,
          content: "ok",
        })),
      });
    }
  }

  // userTurn is already in `history` (the route persists the user's message
  // before building messages). Don't append it again — that produces a
  // duplicate user turn that confuses the model.

  return messages;
}

export interface DiscoveryStreamEvent {
  type: "text" | "tool_use" | "stop";
  text?: string;
  tool?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  reason?: string;
}

export async function* runDiscoveryStream(
  args: BuildMessagesArgs
): AsyncGenerator<DiscoveryStreamEvent, void, void> {
  const client = getAnthropic();
  const stream = client.messages.stream({
    model: env.discoveryModel(),
    max_tokens: 4000,
    system: buildSystemBlocks() as Anthropic.Messages.MessageCreateParams["system"],
    tools: DISCOVERY_TOOLS,
    messages: buildMessages(args),
  });

  const pendingToolInputs = new Map<number, { id: string; name: string; jsonChunks: string[] }>();

  for await (const evt of stream) {
    if (evt.type === "content_block_start") {
      if (evt.content_block.type === "tool_use") {
        pendingToolInputs.set(evt.index, {
          id: evt.content_block.id,
          name: evt.content_block.name,
          jsonChunks: [],
        });
      }
    } else if (evt.type === "content_block_delta") {
      if (evt.delta.type === "text_delta") {
        yield { type: "text", text: evt.delta.text };
      } else if (evt.delta.type === "input_json_delta") {
        const pending = pendingToolInputs.get(evt.index);
        if (pending) pending.jsonChunks.push(evt.delta.partial_json);
      }
    } else if (evt.type === "content_block_stop") {
      const pending = pendingToolInputs.get(evt.index);
      if (pending) {
        let input: Record<string, unknown> = {};
        const joined = pending.jsonChunks.join("");
        if (joined.trim().length > 0) {
          try {
            input = JSON.parse(joined);
          } catch {
            input = { __raw: joined };
          }
        }
        yield {
          type: "tool_use",
          tool: { id: pending.id, name: pending.name, input },
        };
        pendingToolInputs.delete(evt.index);
      }
    } else if (evt.type === "message_stop") {
      yield { type: "stop", reason: "end_of_message" };
    }
  }
}

// ─── Stub mode: scripted response when ANTHROPIC_API_KEY is missing ─────────

export async function* runDiscoveryStubStream({
  history,
  tenantName,
  ownerName,
}: BuildMessagesArgs): AsyncGenerator<DiscoveryStreamEvent, void, void> {
  const turn = history.filter((m) => m.role === "assistant").length;
  const lines: string[] =
    turn === 0
      ? [
          `Hi ${ownerName ?? "there"} — welcome to Zarg.`,
          ``,
          `I'm going to ask a handful of short questions about how ${tenantName} runs today, then I'll build your operations profile and we'll set up the daily briefing.`,
          ``,
          `First question: what does ${tenantName} actually do? In a sentence — what service do you sell, and to whom?`,
          ``,
          `<quick>We're a yoga studio</quick>`,
          `<quick>Hair salon</quick>`,
          `<quick>Tutoring</quick>`,
          `<quick>Something else — I'll type it</quick>`,
          ``,
          `_(Demo mode: ANTHROPIC_API_KEY is not set, so I'm reading from a canned script. Drop the key in .env.local and restart to talk to a real model.)_`,
        ]
      : [
          `(Demo response — turn ${turn + 1}.)`,
          ``,
          `Got it. In the real model, I'd be asking follow-up questions to fill in goals, KPIs, key workflows, and constraints. Once ANTHROPIC_API_KEY is set, this conversation will be driven by Claude Opus.`,
          ``,
          `For now I'll record one demo profile field so you can see the right-hand panel update.`,
          ``,
          `<quick>Continue</quick>`,
        ];

  for (const line of lines) {
    yield { type: "text", text: line + "\n" };
    await new Promise((r) => setTimeout(r, 30));
  }

  // Emit one example tool call so the UI's record-profile-field plumbing is exercised.
  if (turn === 0) {
    yield {
      type: "tool_use",
      tool: {
        id: "stub-1",
        name: "record_profile_field",
        input: { field: "name", value: tenantName },
      },
    };
  } else {
    yield {
      type: "tool_use",
      tool: {
        id: `stub-${turn + 1}`,
        name: "record_profile_field",
        input: { field: "domain", value: "demo-domain" },
      },
    };
  }
  yield { type: "stop", reason: "stub_end" };
}
