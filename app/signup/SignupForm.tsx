"use client";

import { useActionState } from "react";
import { Pill } from "@/components/ui/Pill";
import { signupAction, type SignupActionState } from "@/lib/actions/signup";

const initial: SignupActionState = { ok: false };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initial);

  if (state.ok && state.email) {
    return (
      <div>
        <p className="font-dm-sans text-[16px] text-canvas-white">
          Check your inbox — we sent a magic link to{" "}
          <span className="font-medium">{state.email}</span>.
        </p>
        <p className="font-dm-sans mt-3 text-[14px] tracking-[0.35px] text-slate-text">
          The link works for 24 hours. You can close this tab.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="font-dm-sans text-[14px] tracking-[0.35px] text-ash-text">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@yourstudio.com"
          className="mt-2 block w-full rounded-[10px] border border-ghost-white bg-transparent px-3 py-2.5 font-dm-sans text-[16px] tracking-[0.4px] text-canvas-white placeholder:text-slate-text outline-none focus:border-canvas-white"
        />
      </label>
      {state.error && (
        <p className="font-dm-sans text-[14px] tracking-[0.35px] text-[#ff9a8a]">{state.error}</p>
      )}
      <Pill type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Sending magic link…" : "Send me a magic link"}
      </Pill>
    </form>
  );
}
