"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/ui/Pill";
import { Ghost } from "@/components/ui/Ghost";
import { GhostCard } from "@/components/ui/GhostCard";
import { ProfilePanel, type ProfileShape, type TenantShape } from "./ProfilePanel";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
}

interface StateResponse {
  tenant: TenantShape | null;
  profile: ProfileShape | null;
  messages: Array<{ role: "user" | "assistant"; content: string; toolCalls?: unknown }>;
  finalizedToolCalled: boolean;
}

const QUICK_RE = /<quick>([\s\S]*?)<\/quick>/g;

function extractQuickReplies(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = QUICK_RE.exec(text))) {
    // Split on newlines in case the model crams multiple options into a single block.
    for (const line of m[1].split(/\r?\n/)) {
      const t = line.trim();
      if (t.length > 0 && t.length <= 80) out.push(t);
    }
  }
  return out;
}

function stripQuickBlocks(text: string): string {
  return text.replace(QUICK_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

interface Props {
  ownerName: string | null;
  hasAnthropic: boolean;
}

export function DiscoveryClient({ ownerName, hasAnthropic }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [tenant, setTenant] = useState<TenantShape | null>(null);
  const [profile, setProfile] = useState<ProfileShape | null>(null);
  const [streaming, setStreaming] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const refreshState = useCallback(async () => {
    const r = await fetch("/api/discovery/state", { cache: "no-store" });
    if (!r.ok) return null;
    const data: StateResponse = await r.json();
    setTenant(data.tenant);
    setProfile(data.profile);
    setMessages(
      data.messages.map((m) => ({
        role: m.role,
        content: m.content,
        toolCalls: Array.isArray(m.toolCalls)
          ? (m.toolCalls as Message["toolCalls"])
          : undefined,
      }))
    );
    setFinalized(data.finalizedToolCalled);
    return data;
  }, []);

  const sendTurn = useCallback(
    async (content: string) => {
      setBusy(true);
      setError(null);
      setStreaming("");
      try {
        const r = await fetch("/api/discovery/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!r.ok || !r.body) {
          setError(`Discovery error: ${r.status}`);
          return;
        }
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assembled = "";
        const newTools: Message["toolCalls"] = [];
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
                newTools!.push(evt.tool);
                if (evt.tool.name === "finalize_profile") {
                  setFinalized(true);
                }
                // Refresh profile state after each tool call
                refreshState();
              } else if (evt.type === "error") {
                setError(typeof evt.message === "string" ? evt.message : "Stream error");
              }
            } catch {
              // ignore parse errors on partial frames
            }
          }
        }
        setStreaming("");
        await refreshState();
      } finally {
        setBusy(false);
      }
    },
    [refreshState]
  );

  // Initial load + bootstrap (if no history yet, kick off the agent's greeting)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await refreshState();
      if (cancelled) return;
      if (data && data.messages.length === 0) {
        setBootstrapped(true);
        await sendTurn("");
      } else {
        setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshState, sendTurn]);

  // Auto-scroll chat
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const lastAssistantText = useMemo(() => {
    if (streaming) return streaming;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].content;
    }
    return "";
  }, [messages, streaming]);

  const quickReplies = useMemo(() => extractQuickReplies(lastAssistantText), [lastAssistantText]);

  const handleSend = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      // Optimistic add
      setMessages((m) => [...m, { role: "user", content: t }]);
      setInput("");
      sendTurn(t);
    },
    [busy, sendTurn]
  );

  const handleFinalize = useCallback(() => {
    startTransition(async () => {
      const r = await fetch("/api/discovery/finalize", { method: "POST" });
      if (r.ok) {
        router.push("/onboarding/done");
      }
    });
  }, [router]);

  return (
    <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Chat column */}
      <section className="flex h-[72vh] flex-col">
        {!hasAnthropic && (
          <GhostCard className="mb-3 px-4 py-3">
            <p className="font-dm-sans text-[13px] tracking-[0.35px] text-ash-text">
              Demo mode — ANTHROPIC_API_KEY is not set. Replies come from a canned script. Add the
              key to <code className="text-canvas-white">.env.local</code> and restart to talk to
              Claude.
            </p>
          </GhostCard>
        )}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto rounded-[24px] border border-[rgba(229,229,229,0.06)] bg-[rgba(212,212,212,0.04)] p-4"
        >
          <div className="space-y-3">
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={stripQuickBlocks(m.content)} />
            ))}
            {streaming && (
              <Bubble role="assistant" text={stripQuickBlocks(streaming)} streaming />
            )}
            {!bootstrapped && (
              <p className="font-dm-sans text-[14px] tracking-[0.35px] text-slate-text">
                Loading…
              </p>
            )}
          </div>
        </div>

        {quickReplies.length > 0 && !busy && (
          <div className="mt-3 flex flex-wrap gap-2">
            {quickReplies.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="rounded-full border border-ghost-white px-3 py-1.5 font-dm-sans text-[14px] tracking-[0.35px] text-canvas-white transition-colors hover:bg-[rgba(229,229,229,0.06)]"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={busy ? "Listening…" : "Type your reply…"}
            disabled={busy || finalized}
            className="flex-1 rounded-[10px] border border-ghost-white bg-transparent px-3 py-2.5 font-dm-sans text-[15px] tracking-[0.4px] text-canvas-white placeholder:text-slate-text outline-none focus:border-canvas-white disabled:opacity-50"
          />
          <Pill type="submit" disabled={busy || finalized || !input.trim()}>
            {busy ? "…" : "Send"}
          </Pill>
        </form>
        {error && (
          <p className="mt-2 font-dm-sans text-[14px] tracking-[0.35px] text-[#ff9a8a]">{error}</p>
        )}
        {finalized && (
          <div className="mt-3 flex items-center gap-2">
            <Ghost onClick={() => refreshState()}>Review what was captured</Ghost>
            <Pill onClick={handleFinalize} disabled={isPending}>
              {isPending ? "Setting up your dashboard…" : "Looks good — let's go"}
            </Pill>
          </div>
        )}
      </section>

      <ProfilePanel tenant={tenant} profile={profile} finalized={finalized} />
    </div>
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
            ? "max-w-[80%] rounded-[20px] rounded-br-[8px] bg-canvas-white px-4 py-2.5 text-storm-gray"
            : "max-w-[85%] rounded-[20px] rounded-bl-[8px] bg-storm-gray px-4 py-2.5 text-ghost-white"
        }
      >
        <p className="font-dm-sans whitespace-pre-wrap text-[15px] leading-[1.55] tracking-[0.35px]">
          {text}
          {streaming && <span className="ml-0.5 animate-pulse">▍</span>}
        </p>
      </div>
    </div>
  );
}
