import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./anthropic";
import { LEARNING_TOOLS } from "./learning-tools";
import { assertWithinBudget, recordUsage } from "./cost-guard";
import { env } from "@/lib/env";

const SYSTEM = `You are StarUp's self-learning agent. The owner narrates what's happening in their business — who came to class, who paid, what got booked — and you record it as real data using your tools.

Rules:
- Listen. If the owner tells you something concrete and unambiguous, record it WITH TOOLS in the same turn. If something is ambiguous (vague names, unclear timing), ask one quick clarifying question.
- Use record_person ONLY if the person is genuinely new. The platform fuzzy-matches by name; assume an existing client unless the owner explicitly says they're new.
- For bookings, use record_event first if the event isn't already on the schedule.
- Money: amount_minor is in MINOR units. 5000 AMD = 500000. 28000 AMD = 2800000.
- Default currency: AMD. Default time of day if missing: today's nearest class time the owner mentioned earlier in the conversation.
- After recording, confirm in plain language what you saved (e.g. "Logged: Maria attended today's 7pm class, paid 5,000 AMD cash"). Don't ask "anything else?" — the owner will type more if they want.
- Keep replies to 1-2 short sentences. No fluff.`;

export interface LearningStreamEvent {
  type: "text" | "tool_use" | "tool_result" | "stop" | "error";
  text?: string;
  tool?: { id: string; name: string; input: Record<string, unknown> };
  toolResult?: { tool_use_id: string; content: string; is_error?: boolean };
  reason?: string;
  message?: string;
}

export interface LearningMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
}

interface BuildArgs {
  history: LearningMessage[];
  userTurn: string;
  tenantContext: { name: string; tz: string; domain: string };
  tenantId?: string;
}

function buildSystem(args: BuildArgs): Anthropic.Messages.MessageCreateParams["system"] {
  return [
    { type: "text", text: SYSTEM },
    {
      type: "text",
      text: `Tenant: ${args.tenantContext.name} (${args.tenantContext.domain}, timezone ${args.tenantContext.tz}).`,
    },
  ];
}

type AssistantBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

function buildMessages(args: BuildArgs): Anthropic.Messages.MessageParam[] {
  const messages: Anthropic.Messages.MessageParam[] = [];
  for (const m of args.history) {
    if (m.role === "user") {
      messages.push({ role: "user", content: m.content });
      continue;
    }
    const toolCalls = m.toolCalls ?? [];
    const content: AssistantBlock[] = [];
    if (m.content && m.content.trim().length > 0) {
      content.push({ type: "text", text: m.content });
    }
    for (const t of toolCalls) {
      content.push({ type: "tool_use", id: t.id, name: t.name, input: t.input ?? {} });
    }
    if (content.length === 0) continue;
    messages.push({
      role: "assistant",
      content: content as unknown as Anthropic.Messages.MessageParam["content"],
    });
    if (toolCalls.length > 0) {
      messages.push({
        role: "user",
        content: toolCalls.map((t) => ({
          type: "tool_result" as const,
          tool_use_id: t.id,
          content: "ok",
        })),
      });
    }
  }
  if (args.userTurn.trim().length > 0) {
    // userTurn is the latest user message — appended fresh because in
    // the learning route we don't persist messages before calling this.
    messages.push({ role: "user", content: args.userTurn });
  }
  return messages;
}

export async function* runLearningStream(
  args: BuildArgs
): AsyncGenerator<LearningStreamEvent, void, void> {
  if (args.tenantId) {
    await assertWithinBudget(args.tenantId);
  }
  const client = getAnthropic();
  const model = env.discoveryModel();
  const stream = client.messages.stream({
    model,
    max_tokens: 1500,
    system: buildSystem(args),
    tools: LEARNING_TOOLS,
    messages: buildMessages(args),
  });

  const pending = new Map<number, { id: string; name: string; jsonChunks: string[] }>();

  for await (const evt of stream) {
    if (evt.type === "content_block_start") {
      if (evt.content_block.type === "tool_use") {
        pending.set(evt.index, {
          id: evt.content_block.id,
          name: evt.content_block.name,
          jsonChunks: [],
        });
      }
    } else if (evt.type === "content_block_delta") {
      if (evt.delta.type === "text_delta") {
        yield { type: "text", text: evt.delta.text };
      } else if (evt.delta.type === "input_json_delta") {
        const p = pending.get(evt.index);
        if (p) p.jsonChunks.push(evt.delta.partial_json);
      }
    } else if (evt.type === "content_block_stop") {
      const p = pending.get(evt.index);
      if (p) {
        let input: Record<string, unknown> = {};
        const joined = p.jsonChunks.join("");
        if (joined.trim().length > 0) {
          try {
            input = JSON.parse(joined);
          } catch {
            input = { __raw: joined };
          }
        }
        yield { type: "tool_use", tool: { id: p.id, name: p.name, input } };
        pending.delete(evt.index);
      }
    } else if (evt.type === "message_stop") {
      yield { type: "stop", reason: "end" };
    }
  }

  if (args.tenantId) {
    try {
      const finalMessage = await stream.finalMessage();
      await recordUsage({
        tenantId: args.tenantId,
        kind: "learn",
        model,
        tokensIn: finalMessage.usage?.input_tokens ?? 0,
        tokensOut: finalMessage.usage?.output_tokens ?? 0,
      });
    } catch (err) {
      console.warn("[learning] usage record failed:", err);
    }
  }
}
