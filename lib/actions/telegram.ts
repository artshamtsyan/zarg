"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";

function generateCode(): string {
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // skip ambiguous chars
  const len = 8;
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `LINK-${out}`;
}

export interface LinkCodeResult {
  ok: boolean;
  code?: string;
  expiresAt?: string;
  error?: string;
}

export async function generateLinkCode(): Promise<LinkCodeResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in" };
  const db = getDb();
  const code = generateCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await db
    .update(schema.users)
    .set({
      telegramLinkCode: code,
      telegramLinkExpiresAt: expires,
    })
    .where(eq(schema.users.id, session.user.id));
  revalidatePath("/dashboard/telegram");
  return { ok: true, code, expiresAt: expires.toISOString() };
}

export async function unlinkTelegram(): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };
  const db = getDb();
  await db
    .update(schema.users)
    .set({
      telegramChatId: null,
      telegramLinkCode: null,
      telegramLinkExpiresAt: null,
    })
    .where(eq(schema.users.id, session.user.id));
  revalidatePath("/dashboard/telegram");
  return { ok: true };
}

export async function setBriefingTime(time: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.tenantId) return { ok: false, error: "No tenant" };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return { ok: false, error: "Use HH:MM (24-hour)" };
  }
  const db = getDb();
  await db
    .update(schema.tenants)
    .set({ briefingLocalTime: time })
    .where(eq(schema.tenants.id, session.user.tenantId));
  revalidatePath("/dashboard/telegram");
  return { ok: true };
}

export async function setTenantStatus(status: "active" | "paused"): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.tenantId) return { ok: false };
  const db = getDb();
  await db
    .update(schema.tenants)
    .set({ status })
    .where(eq(schema.tenants.id, session.user.tenantId));
  revalidatePath("/dashboard/telegram");
  return { ok: true };
}
