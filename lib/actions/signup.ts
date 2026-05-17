"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { signIn } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { env, serviceStatus } from "@/lib/env";

const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("That doesn't look like an email."),
});

function demoModeEnabled(): boolean {
  return process.env.AUTH_DEV_BACKDOOR === "true";
}

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

  // DB + AUTH are always required.
  const hardBlockers: string[] = [];
  if (!status.db.ready) hardBlockers.push(...status.db.missing);
  if (!status.auth.ready) hardBlockers.push(...status.auth.missing);
  if (hardBlockers.length > 0) {
    return {
      ok: false,
      error: `Auth not configured yet. Add: ${hardBlockers.join(", ")}`,
    };
  }

  const parsed = signupSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // If Resend (email sender) isn't configured, fall back to direct sign-in
  // when demo mode is explicitly enabled. Otherwise error out as before.
  if (!status.email.ready) {
    if (!demoModeEnabled()) {
      return {
        ok: false,
        error: `Email not configured yet. Add: ${status.email.missing.join(", ")} — or set AUTH_DEV_BACKDOOR=true to sign in directly.`,
      };
    }

    const db = getDb();
    let [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, parsed.data.email))
      .limit(1);

    if (!user) {
      const id = crypto.randomUUID();
      await db.insert(schema.users).values({
        id,
        email: parsed.data.email,
        emailVerified: new Date(),
      });
      [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);
    }

    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(schema.sessions).values({
      sessionToken: token,
      userId: user.id,
      expires,
    });

    const cookieStore = await cookies();
    cookieStore.set({
      name: "authjs.session-token",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires,
    });

    redirect(user.tenantId ? "/onboarding" : "/welcome");
  }

  // Standard magic-link flow.
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
