import { auth } from "@/lib/auth/auth";
import { env } from "@/lib/env";
import { getDb, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { runLearningStream, type LearningMessage } from "@/lib/ai/learning";
import {
  recordPerson,
  recordEvent,
  recordBooking,
  recordPayment,
} from "@/lib/db/learn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ToolReceipt {
  ok: boolean;
  detail: string;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return new Response("Unauthorized", { status: 401 });
  const tenantId = session.user.tenantId;

  const body = (await req.json().catch(() => ({}))) as {
    content?: string;
    history?: LearningMessage[];
  };
  const userTurn = (body.content ?? "").trim();
  const history = Array.isArray(body.history) ? body.history : [];

  const db = getDb();
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);
  if (!tenant) return new Response("Tenant not found", { status: 404 });

  if (!env.hasAnthropic()) {
    return new Response("Anthropic key not configured", { status: 503 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      };
      try {
        for await (const evt of runLearningStream({
          tenantId,
          history,
          userTurn,
          tenantContext: {
            name: tenant.name,
            tz: tenant.timezone || "Asia/Yerevan",
            domain: tenant.domain,
          },
        })) {
          if (evt.type === "text" && evt.text) {
            send({ type: "text", text: evt.text });
          } else if (evt.type === "tool_use" && evt.tool) {
            const receipt = await applyTool(tenantId, tenant.timezone || "Asia/Yerevan", evt.tool);
            send({ type: "tool_use", tool: evt.tool, receipt });
          } else if (evt.type === "stop") {
            send({ type: "stop" });
          }
        }
      } catch (err) {
        console.error("[learn] stream error", err);
        const isBudget = err instanceof Error && err.name === "BudgetExceededError";
        send({
          type: "error",
          message: isBudget
            ? "You've hit today's AI usage limit. Try again tomorrow — or upgrade your plan."
            : err instanceof Error
              ? err.message
              : "Stream error",
          code: isBudget ? "budget_exceeded" : "stream_error",
        });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function applyTool(
  tenantId: string,
  tz: string,
  tool: { name: string; input: Record<string, unknown> }
): Promise<ToolReceipt> {
  try {
    const i = tool.input as Record<string, unknown>;
    const str = (k: string) => (typeof i[k] === "string" ? (i[k] as string) : undefined);
    const num = (k: string) => (typeof i[k] === "number" ? (i[k] as number) : undefined);

    switch (tool.name) {
      case "record_person": {
        const name = str("name");
        if (!name) return { ok: false, detail: "missing name" };
        const r = await recordPerson(tenantId, {
          name,
          phone: str("phone"),
          status: str("status"),
          segment: str("segment"),
          notes: str("notes"),
        });
        return { ok: true, detail: r.alreadyExisted ? "person already on file" : "added person" };
      }
      case "record_event": {
        const when = str("when");
        if (!when) return { ok: false, detail: "missing when" };
        const r = await recordEvent(tenantId, tz, {
          when,
          duration_min: num("duration_min"),
          staff_name: str("staff_name"),
          capacity: num("capacity"),
          type: str("type"),
          status: str("status"),
        });
        return { ok: true, detail: r.alreadyExisted ? "event already scheduled" : "scheduled event" };
      }
      case "record_booking": {
        const person_name = str("person_name");
        const event_when = str("event_when");
        if (!person_name || !event_when) return { ok: false, detail: "missing person_name or event_when" };
        const r = await recordBooking(tenantId, tz, {
          person_name,
          event_when,
          status: str("status"),
          attendance: str("attendance"),
        });
        return r.ok
          ? { ok: true, detail: "booking recorded" }
          : { ok: false, detail: r.error ?? "booking failed" };
      }
      case "record_payment": {
        const amount_minor = num("amount_minor");
        if (amount_minor === undefined) return { ok: false, detail: "missing amount_minor" };
        const r = await recordPayment(tenantId, tz, {
          amount_minor,
          person_name: str("person_name"),
          currency: str("currency"),
          method: str("method"),
          status: str("status"),
          kind: str("kind"),
          when: str("when"),
        });
        return {
          ok: true,
          detail: r.personId ? "payment recorded" : "payment recorded (no person matched)",
        };
      }
      default:
        return { ok: false, detail: `unknown tool: ${tool.name}` };
    }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "error" };
  }
}
