"use client";

import { useActionState } from "react";
import { Pill } from "@/components/ui/Pill";
import { welcomeAction, type WelcomeActionState } from "@/lib/actions/welcome";

const initial: WelcomeActionState = { ok: false };

const inputClass =
  "mt-2 block w-full rounded-[10px] border border-ghost-white bg-transparent px-3 py-2.5 font-dm-sans text-[16px] tracking-[0.4px] text-canvas-white placeholder:text-slate-text outline-none focus:border-canvas-white";

export function WelcomeForm() {
  const [state, formAction, pending] = useActionState(welcomeAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="font-dm-sans text-[14px] tracking-[0.35px] text-ash-text">Your name</span>
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
        <span className="font-dm-sans text-[14px] tracking-[0.35px] text-ash-text">Business name</span>
        <input
          name="businessName"
          required
          maxLength={120}
          placeholder="Avan Yoga"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="font-dm-sans text-[14px] tracking-[0.35px] text-ash-text">
          Timezone
        </span>
        <input
          name="timezone"
          defaultValue="Asia/Yerevan"
          placeholder="Asia/Yerevan"
          className={inputClass}
        />
        <span className="font-dm-sans mt-1 block text-[13px] tracking-[0.35px] text-slate-text">
          IANA name. Used for the daily briefing time.
        </span>
      </label>
      {state.error && (
        <p className="font-dm-sans text-[14px] tracking-[0.35px] text-[#ff9a8a]">{state.error}</p>
      )}
      <Pill type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Setting things up…" : "Start discovery"}
      </Pill>
    </form>
  );
}
