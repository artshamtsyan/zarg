"use client";

import { useActionState } from "react";
import { Pill } from "@/components/ui/Pill";
import { welcomeAction, type WelcomeActionState } from "@/lib/actions/welcome";

const initial: WelcomeActionState = { ok: false };

const inputClass =
  "mt-1.5 block w-full rounded-[10px] border border-whisper-gray bg-canvas-ice px-3 py-2.5 text-[16px] text-ink placeholder:text-whisper-gray outline-none focus:border-outline-blue";

export function WelcomeForm() {
  const [state, formAction, pending] = useActionState(welcomeAction, initial);

  return (
    <form action={formAction} className="space-y-3">
      <label className="block">
        <span className="text-[12px] uppercase tracking-[1px] text-slate">Your name</span>
        <input
          name="fullName"
          required
          maxLength={120}
          autoComplete="name"
          placeholder="Anush Petrosyan"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-[12px] uppercase tracking-[1px] text-slate">Business name</span>
        <input
          name="businessName"
          required
          maxLength={120}
          placeholder="Avan Yoga"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-[12px] uppercase tracking-[1px] text-slate">Timezone</span>
        <input
          name="timezone"
          defaultValue="Asia/Yerevan"
          placeholder="Asia/Yerevan"
          className={inputClass}
        />
        <span className="mt-1 block text-[12px] text-slate">
          IANA name. Used for the daily briefing time.
        </span>
      </label>
      {state.error && (
        <p className="text-[13px] text-accent-orange">{state.error}</p>
      )}
      <Pill type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Setting things up…" : "Start discovery"}
      </Pill>
    </form>
  );
}
