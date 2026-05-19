import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/ai/anthropic";
import { assertWithinBudget, recordUsage } from "@/lib/ai/cost-guard";
import { env } from "@/lib/env";

export interface ExtractedPerson {
  name: string;
  phone?: string | null;
  status?: "new" | "trial" | "active" | "paused";
  segment?: string | null;
  notes?: string | null;
}

const EXTRACT_TOOL: Anthropic.Messages.Tool = {
  name: "emit_people",
  description:
    "Emit the list of distinct people you found in the input. Skip duplicates. Skip the owner themselves. Skip lines that aren't about a specific person.",
  input_schema: {
    type: "object",
    properties: {
      people: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Full name of the person as it appears in the input (or best inferred).",
            },
            phone: {
              type: "string",
              description: "Phone number if mentioned; otherwise omit.",
            },
            status: {
              type: "string",
              enum: ["new", "trial", "active", "paused"],
              description: "Best guess from context. Default to 'active' if unclear.",
            },
            segment: {
              type: "string",
              description: "Level / segment / category if mentioned (e.g. beginner, regular, VIP, kid).",
            },
            notes: {
              type: "string",
              description: "Short context line. Things like preferred days, package info, anything the owner clearly noted.",
            },
          },
          required: ["name"],
        },
      },
    },
    required: ["people"],
  },
};

const SYSTEM = `You extract a list of distinct people (customers / clients / students / patients) from messy text.

The input may be:
- A list of names typed one per line
- A WhatsApp or Telegram chat dump
- Free-form notes
- A mix of all of the above

For each distinct person, emit one entry with: name, phone if any, a status guess (new/trial/active/paused — default 'active'), a segment/level if any, and a short notes line preserving anything specific the owner noted (preferred class, package info, "books a month at a time", etc.).

Rules:
- ONE entry per person. Dedupe across the whole input.
- Use the name exactly as written. Don't translate or reformat it.
- If only a first name is given, use that.
- If a line clearly isn't about a person (a date, a price, a generic message), skip it.
- Don't invent phones, statuses, or details that aren't in the text.
- Always call emit_people, even if the list is empty.
- Don't write any prose; the tool call is the entire output.`;

export interface ExtractResult {
  ok: boolean;
  people: ExtractedPerson[];
  source: "llm" | "fallback";
  error?: string;
}

const MAX_INPUT_CHARS = 12_000;

export async function extractPeopleFromText(
  tenantId: string,
  text: string
): Promise<ExtractResult> {
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    return { ok: true, people: [], source: "fallback" };
  }
  if (trimmed.length > MAX_INPUT_CHARS) {
    return {
      ok: false,
      people: [],
      source: "fallback",
      error: `Input too long (${trimmed.length} chars; max ${MAX_INPUT_CHARS}). Split into smaller chunks.`,
    };
  }

  if (!env.hasAnthropic()) {
    return { ok: true, people: fallbackParseLines(trimmed), source: "fallback" };
  }

  try {
    await assertWithinBudget(tenantId);
  } catch (err) {
    if (err instanceof Error && err.name === "BudgetExceededError") {
      // Out of LLM budget — degrade gracefully to line-based parsing.
      return { ok: true, people: fallbackParseLines(trimmed), source: "fallback" };
    }
    throw err;
  }

  const client = getAnthropic();
  const model = env.briefingModel();
  const res = await client.messages.create({
    model,
    max_tokens: 4000,
    system: SYSTEM,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "emit_people" },
    messages: [{ role: "user", content: trimmed }],
  });

  try {
    await recordUsage({
      tenantId,
      kind: "learn",
      model,
      tokensIn: res.usage?.input_tokens ?? 0,
      tokensOut: res.usage?.output_tokens ?? 0,
      metadata: { source: "csv_paste_extract" },
    });
  } catch (err) {
    console.warn("[extract] usage record failed:", err);
  }

  for (const block of res.content) {
    if (block.type === "tool_use" && block.name === "emit_people") {
      const raw = block.input as { people?: ExtractedPerson[] };
      const people = (raw.people ?? [])
        .filter((p) => p && typeof p.name === "string" && p.name.trim().length > 0)
        .map((p) => ({
          name: p.name.trim().slice(0, 120),
          phone: p.phone ? p.phone.trim().slice(0, 40) : null,
          status: p.status ?? "active",
          segment: p.segment ? p.segment.trim().slice(0, 60) : null,
          notes: p.notes ? p.notes.trim().slice(0, 240) : null,
        }));
      return { ok: true, people, source: "llm" };
    }
  }
  // Model didn't call the tool — fall back to line parsing.
  return { ok: true, people: fallbackParseLines(trimmed), source: "fallback" };
}

// ─── Fallback: parse one name per line + try to grab a phone ────────────

const PHONE_RE = /(\+?\d[\d\s\-()]{6,}\d)/;

function fallbackParseLines(text: string): ExtractedPerson[] {
  const out: ExtractedPerson[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim().replace(/^[-*•·]\s*/, "");
    if (!t) continue;
    const phoneMatch = t.match(PHONE_RE);
    let phone: string | null = null;
    let name = t;
    if (phoneMatch) {
      phone = phoneMatch[1].trim();
      name = t.replace(phoneMatch[0], "").replace(/[,;:|–—-]\s*$/, "").trim();
    }
    if (!name) continue;
    out.push({
      name: name.slice(0, 120),
      phone,
      status: "active",
      segment: null,
      notes: null,
    });
  }
  return out;
}
