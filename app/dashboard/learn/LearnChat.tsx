"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Pill } from "@/components/ui/Pill";

interface ToolReceipt {
  id: string;
  name: string;
  ok: boolean;
  detail: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  receipts?: ToolReceipt[];
  toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
}

const TOOL_LABELS: Record<string, string> = {
  record_person: "Added person",
  record_event: "Scheduled event",
  record_booking: "Recorded booking",
  record_payment: "Recorded payment",
};

export function LearnChat() {
  const searchParams = useSearchParams();
  const prefill = searchParams?.get("prefill") ?? "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState<string>("");
  const [streamingReceipts, setStreamingReceipts] = useState<ToolReceipt[]>([]);
  const [input, setInput] = useState(prefill);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // If we arrive with ?prefill=…, pre-fill the input once.
  useEffect(() => {
    if (prefill) setInput(prefill);
    // intentionally only on first mount with the URL param
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const sendTurn = useCallback(
    async (content: string) => {
      setBusy(true);
      setError(null);
      setStreaming("");
      setStreamingReceipts([]);
      const historySnapshot: Message[] = [...messages];
      try {
        const r = await fetch("/api/learn/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            history: historySnapshot.map((m) => ({
              role: m.role,
              content: m.content,
              toolCalls: m.toolCalls,
            })),
          }),
        });
        if (!r.ok || !r.body) {
          setError(`Learn error: ${r.status}`);
          return;
        }
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assembled = "";
        const calls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
        const receipts: ToolReceipt[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const m = line.match(/^data: (.+)$/m);
            if (!m) continue;
            try {
              const evt = JSON.parse(m[1]);
              if (evt.type === "text" && typeof evt.text === "string") {
                assembled += evt.text;
                setStreaming(assembled);
              } else if (evt.type === "tool_use" && evt.tool) {
                calls.push(evt.tool);
                if (evt.receipt) {
                  const r: ToolReceipt = {
                    id: evt.tool.id,
                    name: evt.tool.name,
                    ok: Boolean(evt.receipt.ok),
                    detail: evt.receipt.detail ?? "",
                  };
                  receipts.push(r);
                  setStreamingReceipts((prev) => [...prev, r]);
                }
              } else if (evt.type === "error") {
                setError(evt.message ?? "Stream error");
              }
            } catch {
              // ignore partial parse
            }
          }
        }
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: assembled,
            receipts: receipts.length > 0 ? receipts : undefined,
            toolCalls: calls.length > 0 ? calls : undefined,
          },
        ]);
        setStreaming("");
        setStreamingReceipts([]);
      } finally {
        setBusy(false);
      }
    },
    [messages]
  );

  const handleSend = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      setMessages((m) => [...m, { role: "user", content: t }]);
      setInput("");
      sendTurn(t);
    },
    [busy, sendTurn]
  );

  return (
    <section className="flex h-[64vh] flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-[24px] border border-whisper-gray/40 bg-canvas-ice p-5"
      >
        {messages.length === 0 && !streaming && (
          <p className="text-[14px] text-slate">
            Type anything that happened — StarUp will record it. Try one of the examples on the right.
          </p>
        )}
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i}>
              <Bubble role={m.role} text={m.content} />
              {m.receipts && m.receipts.length > 0 && (
                <ReceiptList receipts={m.receipts} />
              )}
            </div>
          ))}
          {streaming && <Bubble role="assistant" text={streaming} streaming />}
          {streamingReceipts.length > 0 && <ReceiptList receipts={streamingReceipts} />}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="mt-3 flex gap-2.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={busy ? "Recording…" : "What happened? e.g. Maria came to today's 7pm class, paid 5000 cash"}
          disabled={busy}
          className="flex-1 rounded-[10px] border border-whisper-gray bg-canvas-ice px-3 py-2.5 text-[15px] text-ink placeholder:text-whisper-gray outline-none focus:border-outline-blue disabled:opacity-50"
        />
        <Pill type="submit" disabled={busy || !input.trim()}>
          {busy ? "…" : "Tell StarUp"}
        </Pill>
      </form>
      {error && <p className="mt-2 text-[13px] text-accent-orange">{error}</p>}
    </section>
  );
}

function Bubble({
  role,
  text,
  streaming,
}: {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-[20px] rounded-br-[6px] bg-outline-blue px-4 py-2.5 text-canvas-ice"
            : "max-w-[85%] rounded-[20px] rounded-bl-[6px] bg-task-card-mint px-4 py-2.5 text-ink"
        }
      >
        <p className="whitespace-pre-wrap text-[15px] leading-[1.5]">
          {text}
          {streaming && <span className="ml-0.5 animate-pulse">▍</span>}
        </p>
      </div>
    </div>
  );
}

function ReceiptList({ receipts }: { receipts: ToolReceipt[] }) {
  return (
    <div className="mt-2 flex flex-wrap justify-start gap-2">
      {receipts.map((r) => (
        <span
          key={r.id}
          className={
            r.ok
              ? "inline-flex items-center gap-1.5 rounded-full bg-task-card-yellow px-3 py-1 text-[11px] uppercase tracking-[1px] text-ink"
              : "inline-flex items-center gap-1.5 rounded-full border border-accent-orange bg-canvas-ice px-3 py-1 text-[11px] uppercase tracking-[1px] text-accent-orange"
          }
        >
          {r.ok ? "✓" : "!"} {TOOL_LABELS[r.name] ?? r.name}
          <span className="font-normal normal-case tracking-normal text-ink/70">· {r.detail}</span>
        </span>
      ))}
    </div>
  );
}
