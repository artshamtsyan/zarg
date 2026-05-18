import { auth } from "@/lib/auth/auth";
import { env } from "@/lib/env";
import {
  runDiscoveryStream,
  runDiscoveryStubStream,
  type DiscoveryStreamEvent,
} from "@/lib/ai/discovery";
import {
  appendMessage,
  appendWorkflow,
  applyProfileField,
  loadHistory,
  setAssessment,
  setFinalization,
} from "@/lib/db/discovery";
import { getDb, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const ownerName = session.user.fullName ?? session.user.name ?? null;

  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const userTurn = (body.content ?? "").trim();

  const db = getDb();
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);
  if (!tenant) return new Response("Tenant not found", { status: 404 });

  const history = await loadHistory(tenantId);

  if (history.length > 0 && userTurn) {
    await appendMessage(tenantId, { role: "user", content: userTurn });
  }

  const refreshed = await loadHistory(tenantId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (evt: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
      };

      const args = {
        tenantId,
        tenantName: tenant.name,
        ownerName,
        history: refreshed.filter((m) => m.role !== "tool"),
        userTurn,
      };

      const generator = env.hasAnthropic()
        ? runDiscoveryStream(args)
        : runDiscoveryStubStream(args);

      const collectedText: string[] = [];
      const collectedTools: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

      try {
        for await (const evt of generator as AsyncGenerator<DiscoveryStreamEvent>) {
          if (evt.type === "text" && evt.text) {
            collectedText.push(evt.text);
            send({ type: "text", text: evt.text });
          } else if (evt.type === "tool_use" && evt.tool) {
            collectedTools.push(evt.tool);
            try {
              await applyTool(tenantId, evt.tool);
            } catch (err) {
              console.error("[discovery] tool apply failed", err);
            }
            send({ type: "tool_use", tool: evt.tool });
          } else if (evt.type === "stop") {
            send({ type: "stop", reason: evt.reason ?? "end" });
          }
        }
      } catch (err) {
        console.error("[discovery] stream error", err);
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

      const finalText = collectedText.join("");
      if (finalText.trim().length > 0 || collectedTools.length > 0) {
        await appendMessage(tenantId, {
          role: "assistant",
          content: finalText,
          toolCalls: collectedTools.length > 0 ? collectedTools : undefined,
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
  tool: { name: string; input: Record<string, unknown> }
) {
  if (tool.name === "record_profile_field") {
    const field = String(tool.input.field ?? "");
    if (!field) return;
    await applyProfileField(tenantId, { field, value: tool.input.value });
    return;
  }
  if (tool.name === "propose_workflow") {
    await appendWorkflow(tenantId, tool.input);
    return;
  }
  if (tool.name === "assess_automation") {
    await setAssessment(tenantId, tool.input);
    return;
  }
  if (tool.name === "finalize_profile") {
    await setFinalization(tenantId, tool.input);
    // Tenant flip is handled by /api/discovery/finalize after the user confirms.
    return;
  }
}
