"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";

const welcomeSchema = z.object({
  fullName: z.string().trim().min(1, "Tell us your name.").max(120),
  businessName: z.string().trim().min(1, "What's the business called?").max(120),
  timezone: z.string().trim().min(1).max(64).default("Asia/Yerevan"),
});

export type WelcomeActionState = {
  ok: boolean;
  error?: string;
};

export async function welcomeAction(
  _prev: WelcomeActionState,
  formData: FormData
): Promise<WelcomeActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "You need to sign in first." };
  }

  const parsed = welcomeSchema.safeParse({
    fullName: formData.get("fullName"),
    businessName: formData.get("businessName"),
    timezone:
      (formData.get("timezone") as string | null)?.trim() || "Asia/Yerevan",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    const [tenant] = await tx
      .insert(schema.tenants)
      .values({
        name: parsed.data.businessName,
        timezone: parsed.data.timezone,
        status: "onboarding",
      })
      .returning({ id: schema.tenants.id });
    await tx
      .insert(schema.businessProfiles)
      .values({ tenantId: tenant.id })
      .onConflictDoNothing();
    await tx
      .update(schema.users)
      .set({ fullName: parsed.data.fullName, tenantId: tenant.id, name: parsed.data.fullName })
      .where(eq(schema.users.id, session.user.id));
  });

  redirect("/onboarding");
}
