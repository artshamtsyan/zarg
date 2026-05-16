"use server";

import { z } from "zod";
import { signIn } from "@/lib/auth/auth";
import { env, serviceStatus } from "@/lib/env";

const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("That doesn't look like an email."),
});

export type SignupActionState = {
  ok: boolean;
  error?: string;
  email?: string;
};

export async function signupAction(
  _prev: SignupActionState,
  formData: FormData
): Promise<SignupActionState> {
  const status = serviceStatus();
  const blockers: string[] = [];
  if (!status.db.ready) blockers.push(...status.db.missing);
  if (!status.auth.ready) blockers.push(...status.auth.missing);
  if (!status.email.ready) blockers.push(...status.email.missing);
  if (blockers.length > 0) {
    return {
      ok: false,
      error: `Auth not configured yet. Add: ${blockers.join(", ")} to .env.local`,
    };
  }

  const raw = { email: formData.get("email") };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await signIn("resend", {
      email: parsed.data.email,
      redirect: false,
      redirectTo: `${env.appUrl}/welcome`,
    });
    return { ok: true, email: parsed.data.email };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sign-in failed" };
  }
}
