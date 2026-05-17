"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskCard } from "@/components/ui/TaskCard";
import { Pill, PillLink } from "@/components/ui/Pill";
import { Ghost } from "@/components/ui/Ghost";
import {
  generateLinkCode,
  unlinkTelegram,
  setBriefingTime,
  setTenantStatus,
} from "@/lib/actions/telegram";

interface InitialState {
  linked: boolean;
  telegramChatId: string | null;
  code: string | null;
  codeExpiresAt: string | null;
  botUsername: string;
  tenantStatus: string;
  briefingLocalTime: string;
  timezone: string;
}

export function TelegramPanel({ initialState }: { initialState: InitialState }) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const [timeInput, setTimeInput] = useState(state.briefingLocalTime);
  const [error, setError] = useState<string | null>(null);

  // Poll the user row every 2s while waiting for the linking webhook to fire
  useEffect(() => {
    if (state.linked || !state.code) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 2500);
    return () => clearInterval(interval);
  }, [state.linked, state.code, router]);

  // Sync incoming initialState if router.refresh re-runs the parent
  useEffect(() => {
    setState(initialState);
    setTimeInput(initialState.briefingLocalTime);
  }, [initialState]);

  const handleGenerate = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const r = await generateLinkCode();
      if (r.ok) {
        router.refresh();
      } else {
        setError(r.error ?? "Couldn't generate code");
      }
    });
  }, [router]);

  const handleUnlink = useCallback(() => {
    startTransition(async () => {
      await unlinkTelegram();
      router.refresh();
    });
  }, [router]);

  const handleSaveTime = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const r = await setBriefingTime(timeInput);
      if (r.ok) router.refresh();
      else setError(r.error ?? "Couldn't save time");
    });
  }, [timeInput, router]);

  const handleTogglePause = useCallback(() => {
    startTransition(async () => {
      await setTenantStatus(state.tenantStatus === "paused" ? "active" : "paused");
      router.refresh();
    });
  }, [state.tenantStatus, router]);

  const codeExpired = state.codeExpiresAt
    ? new Date(state.codeExpiresAt).getTime() < Date.now()
    : false;

  if (state.linked) {
    return (
      <div className="mt-8 space-y-5">
        <TaskCard tone="mint" className="p-7">
          <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">Linked</p>
          <h2 className="mt-2 text-[22px] font-semibold text-ink">Your Telegram is connected.</h2>
          <p className="mt-3 text-[15px] leading-[1.55] text-ink/80">
            Briefings arrive every morning at{" "}
            <strong>
              {state.briefingLocalTime} {state.timezone}
            </strong>
            {state.tenantStatus === "paused" && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-task-card-yellow px-2 py-0.5 text-[11px] uppercase tracking-[1px] text-ink">
                paused
              </span>
            )}
            .
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Ghost onClick={handleUnlink} disabled={pending}>
              Unlink Telegram
            </Ghost>
            <Ghost onClick={handleTogglePause} disabled={pending}>
              {state.tenantStatus === "paused" ? "Resume briefings" : "Pause briefings"}
            </Ghost>
          </div>
        </TaskCard>

        <TaskCard tone="ice" className="p-6">
          <p className="text-[11px] uppercase tracking-[1.5px] text-slate">Briefing time</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              type="time"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="rounded-[10px] border border-whisper-gray bg-canvas-ice px-3 py-2 text-[15px] text-ink outline-none focus:border-outline-blue"
            />
            <span className="text-[14px] text-slate">{state.timezone}</span>
            <Pill onClick={handleSaveTime} disabled={pending || timeInput === state.briefingLocalTime}>
              {pending ? "Saving…" : "Save"}
            </Pill>
          </div>
          {error && <p className="mt-2 text-[13px] text-accent-orange">{error}</p>}
        </TaskCard>
      </div>
    );
  }

  // Not linked yet
  if (!state.code || codeExpired) {
    return (
      <TaskCard tone="sky" className="mt-8 p-7">
        <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">Step 1 of 2</p>
        <h2 className="mt-2 text-[22px] font-semibold text-ink">Generate a one-time code</h2>
        <p className="mt-3 text-[15px] leading-[1.55] text-ink/80">
          Click below — we'll generate a fresh code and open Telegram. The link expires in 15
          minutes for safety.
        </p>
        <div className="mt-6">
          <Pill onClick={handleGenerate} disabled={pending} size="lg">
            {pending ? "Generating…" : "Generate code"}
          </Pill>
        </div>
        {error && <p className="mt-3 text-[13px] text-accent-orange">{error}</p>}
      </TaskCard>
    );
  }

  const deepLink = `https://t.me/${state.botUsername}?start=${state.code}`;
  return (
    <TaskCard tone="sky" className="mt-8 p-7">
      <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">Step 2 of 2</p>
      <h2 className="mt-2 text-[22px] font-semibold text-ink">Open Telegram and link</h2>
      <p className="mt-3 text-[15px] leading-[1.55] text-ink/80">
        Click the button below. It opens Telegram, sends your linking code to the bot, and we'll
        flip this card to "Linked" as soon as the webhook fires (usually within a second).
      </p>
      <div className="mt-5 rounded-[14px] bg-canvas-ice px-4 py-3 font-mono text-[15px] text-ink">
        {state.code}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <PillLink href={deepLink} external size="lg">
          Open Telegram
        </PillLink>
        <Ghost onClick={handleGenerate} disabled={pending}>
          Regenerate code
        </Ghost>
      </div>
      <p className="mt-4 text-[12px] text-slate">
        Expires{" "}
        {state.codeExpiresAt &&
          new Date(state.codeExpiresAt).toLocaleString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        . Bot: <strong>@{state.botUsername}</strong>. We're checking for the link every couple of
        seconds.
      </p>
      {error && <p className="mt-3 text-[13px] text-accent-orange">{error}</p>}
    </TaskCard>
  );
}
