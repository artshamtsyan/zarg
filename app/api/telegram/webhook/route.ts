import { and, eq, gt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { env } from "@/lib/env";
import { answerCallbackQuery, sendMessage } from "@/lib/telegram/client";
import { briefingToMd2, escapeMd2 } from "@/lib/telegram/markdown";
import { sendBriefingMessage, editBriefingMessage, sendPlainText } from "@/lib/telegram/send";
import { buildSnapshot } from "@/lib/db/snapshot";
import { generateBriefingBody } from "@/lib/ai/briefing";
import { ageTenantData } from "@/lib/jobs/age-data";
import { loadProfile } from "@/lib/db/discovery";
import { formatInTimeZone } from "date-fns-tz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Update typings (loose — Telegram has many fields we ignore) ───
interface TgMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; username?: string; first_name?: string };
  text?: string;
  date: number;
}

interface TgCallbackQuery {
  id: string;
  from: { id: number; username?: string; first_name?: string };
  data?: string;
  message?: TgMessage;
}

interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

export async function POST(req: Request) {
  // Verify the secret header set on the webhook
  if (env.hasTelegram()) {
    const expected = env.telegramWebhookSecret();
    const actual = req.headers.get("x-telegram-bot-api-secret-token");
    if (actual !== expected) {
      return new Response("Forbidden", { status: 403 });
    }
  } else {
    return new Response("Telegram not configured", { status: 503 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  try {
    if (update.message) await handleMessage(update.message);
    else if (update.callback_query) await handleCallback(update.callback_query);
  } catch (err) {
    console.error("[telegram/webhook] handler error", err);
  }
  // Always 200 — Telegram retries non-2xx responses indefinitely
  return Response.json({ ok: true });
}

// ─── Message handler ───────────────────────────────────────────────

async function handleMessage(msg: TgMessage) {
  const text = (msg.text ?? "").trim();
  if (!text) return;

  // Parse leading slash command (with or without /start payload)
  const startWithPayload = text.match(/^\/start(?:@\w+)?\s+(\S+)/i);
  if (startWithPayload) {
    return handleLinkStart(msg, startWithPayload[1]);
  }
  if (/^\/start(@\w+)?\s*$/i.test(text)) {
    return sendPlainText(
      msg.chat.id,
      `Welcome to StarUp.\n\nThis bot is linked from your dashboard. Sign in at ${env.appUrl}/signup and follow the Telegram link there to receive your daily briefing.`
    );
  }

  // Authed commands — sender must be a linked owner
  const owner = await findOwnerByChatId(msg.chat.id);
  if (!owner) {
    return sendPlainText(
      msg.chat.id,
      "I don't recognize this chat yet. Sign in to your dashboard and use the linking code there to connect."
    );
  }

  if (/^\/pause(@\w+)?$/i.test(text)) return handlePause(msg.chat.id, owner.tenantId!);
  if (/^\/resume(@\w+)?$/i.test(text)) return handleResume(msg.chat.id, owner.tenantId!);
  if (/^\/preview(@\w+)?$/i.test(text)) return handlePreview(msg.chat.id, owner.tenantId!, owner.fullName);

  return sendPlainText(
    msg.chat.id,
    "Commands:\n• /pause — stop daily briefings\n• /resume — turn them back on\n• /preview — generate today's briefing now"
  );
}

async function findOwnerByChatId(chatId: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.telegramChatId, String(chatId)))
    .limit(1);
  return row ?? null;
}

// ─── /start <code> — linking flow ─────────────────────────────────

async function handleLinkStart(msg: TgMessage, code: string) {
  const db = getDb();
  const [owner] = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.telegramLinkCode, code),
        gt(schema.users.telegramLinkExpiresAt, new Date())
      )
    )
    .limit(1);

  if (!owner) {
    return sendPlainText(
      msg.chat.id,
      "That linking code is invalid or has expired. Generate a fresh one from your dashboard's Telegram page."
    );
  }

  await db
    .update(schema.users)
    .set({
      telegramChatId: String(msg.chat.id),
      telegramLinkCode: null,
      telegramLinkExpiresAt: null,
    })
    .where(eq(schema.users.id, owner.id));

  let briefingTime = "08:00";
  if (owner.tenantId) {
    const [tenant] = await db
      .select({ briefingLocalTime: schema.tenants.briefingLocalTime })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, owner.tenantId))
      .limit(1);
    if (tenant) briefingTime = tenant.briefingLocalTime;
  }

  return sendPlainText(
    msg.chat.id,
    `Linked! Your daily briefing will arrive here every morning at ${briefingTime}.\n\nUse /pause to stop, /resume to turn back on, /preview to generate today's now.`
  );
}

// ─── /pause and /resume ────────────────────────────────────────────

async function handlePause(chatId: number, tenantId: string) {
  const db = getDb();
  await db.update(schema.tenants).set({ status: "paused" }).where(eq(schema.tenants.id, tenantId));
  return sendPlainText(chatId, "Paused. I'll stay quiet until you /resume.");
}

async function handleResume(chatId: number, tenantId: string) {
  const db = getDb();
  await db.update(schema.tenants).set({ status: "active" }).where(eq(schema.tenants.id, tenantId));
  return sendPlainText(chatId, "Resumed. Your next briefing arrives tomorrow morning.");
}

// ─── /preview — on-demand briefing ────────────────────────────────

async function handlePreview(chatId: number, tenantId: string, ownerName: string | null) {
  await sendPlainText(chatId, "Generating your briefing… this takes about 10 seconds.");
  try {
    await ageTenantData(tenantId);
    const snapshot = await buildSnapshot(tenantId, ownerName);
    const profile = await loadProfile(tenantId);
    const body = await generateBriefingBody({
      snapshot,
      profile: { entities: profile?.entities, goals: profile?.goals },
    });

    // Persist
    const db = getDb();
    const tz = snapshot.tenant.timezone;
    const forDate = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
    const [existing] = await db
      .select()
      .from(schema.briefings)
      .where(and(eq(schema.briefings.tenantId, tenantId), eq(schema.briefings.forDate, forDate)))
      .limit(1);

    const sent = await sendBriefingMessage({ chatId, body });

    if (existing) {
      await db
        .update(schema.briefings)
        .set({
          bodyMarkdown: body,
          status: "sent",
          telegramMessageId: sent.message_id,
          sentAt: new Date(),
        })
        .where(eq(schema.briefings.id, existing.id));
    } else {
      await db.insert(schema.briefings).values({
        tenantId,
        forDate,
        bodyMarkdown: body,
        status: "sent",
        telegramMessageId: sent.message_id,
        sentAt: new Date(),
      });
    }
  } catch (err) {
    console.error("[telegram/preview]", err);
    await sendPlainText(chatId, "Sorry — couldn't generate that briefing. Try again from the dashboard.");
  }
}

// ─── Callback queries (inline button presses on briefings) ────────

async function handleCallback(cb: TgCallbackQuery) {
  if (!cb.data || !cb.message) {
    await answerCallbackQuery({ callback_query_id: cb.id });
    return;
  }
  const owner = await findOwnerByChatId(cb.message.chat.id);
  if (!owner || !owner.tenantId) {
    await answerCallbackQuery({ callback_query_id: cb.id, text: "Not linked.", show_alert: true });
    return;
  }

  const [action] = cb.data.split(":").slice(1);
  if (action === "pause") {
    await handlePause(cb.message.chat.id, owner.tenantId);
    await answerCallbackQuery({ callback_query_id: cb.id, text: "Briefings paused." });
    return;
  }
  if (action === "regenerate") {
    await answerCallbackQuery({ callback_query_id: cb.id, text: "Regenerating…" });
    await regenerateBriefingForTenant({
      tenantId: owner.tenantId,
      chatId: cb.message.chat.id,
      messageId: cb.message.message_id,
      ownerName: owner.fullName,
    });
    return;
  }
  await answerCallbackQuery({ callback_query_id: cb.id });
}

async function regenerateBriefingForTenant({
  tenantId,
  chatId,
  messageId,
  ownerName,
}: {
  tenantId: string;
  chatId: number;
  messageId: number;
  ownerName: string | null;
}) {
  try {
    await ageTenantData(tenantId);
    const snapshot = await buildSnapshot(tenantId, ownerName);
    const profile = await loadProfile(tenantId);
    const body = await generateBriefingBody({
      snapshot,
      profile: { entities: profile?.entities, goals: profile?.goals },
    });
    // Edit the existing Telegram message in place; persist the new body.
    await editBriefingMessage({ chatId, messageId, body: body + "\n\n(updated)" });
    const db = getDb();
    const tz = snapshot.tenant.timezone;
    const forDate = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
    await db
      .update(schema.briefings)
      .set({
        bodyMarkdown: body,
        generatedAt: new Date(),
        status: "sent",
        sentAt: new Date(),
      })
      .where(and(eq(schema.briefings.tenantId, tenantId), eq(schema.briefings.forDate, forDate)));
  } catch (err) {
    console.error("[telegram/regenerate]", err);
    await sendPlainText(chatId, "Couldn't regenerate — try /preview to send a fresh one.");
  }
}

// Helpful to import escapeMd2 to keep the file complete — silence unused
// import in case future refactors lean on it.
void escapeMd2;
void briefingToMd2;
