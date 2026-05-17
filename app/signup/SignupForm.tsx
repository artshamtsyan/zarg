"use client";

import { useActionState } from "react";
import { Pill } from "@/components/ui/Pill";
import { signupAction, type SignupActionState } from "@/lib/actions/signup";

const initial: SignupActionState = { ok: false };

export function SignupForm({ demoMode = false }: { demoMode?: boolean }) {
  const [state, formAction, pending] = useActionState(signupAction, initial);

  if (state.ok && state.email) {
    return (
      <div>
        <p className="text-[16px] text-ink">
          Check your inbox — we sent a magic link to{" "}
          <span className="font-medium">{state.email}</span>.
        </p>
        <p className="mt-3 text-[13px] text-slate">
          The link works for 24 hours. You can close this tab.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <label className="block">
        <span className="text-[12px] uppercase tracking-[1px] text-slate">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@yourstudio.com"
          className="mt-1.5 block w-full rounded-[10px] border border-whisper-gray bg-canvas-ice px-3 py-2.5 text-[16px] text-ink placeholder:text-whisper-gray outline-none focus:border-outline-blue"
        />
      </label>
      {state.error && (
        <p className="text-[13px] text-accent-orange">{state.error}</p>
      )}
      <Pill type="submit" size="lg" disabled={pending} className="w-full">
        {pending
          ? demoMode
            ? "Signing you in…"
            : "Sending magic link…"
          : demoMode
            ? "Sign in"
            : "Send me a magic link"}
      </Pill>
    </form>
  );
}
