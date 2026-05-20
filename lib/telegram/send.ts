import { editMessageText, sendMessage, type TelegramInlineKeyboardMarkup } from "./client";
import { briefingToMd2, escapeMd2 } from "./markdown";
import { env } from "@/lib/env";

/**
 * Build the inline keyboard for a morning briefing.
 *
 * If suggestedActions is non-empty, render them as the primary CTAs —
 * each tap routes through the webhook (act:<briefingId>:<idx>) which
 * resolves to /dashboard/learn?prefill=… for the owner to confirm/send.
 *
 * The Open-dashboard + Pause options stay underneath as utility.
 */
function morningBriefingKeyboard(
  briefingId: string,
  suggestedActions: string[] = []
): TelegramInlineKeyboardMarkup {
  const base = env.appUrl;
  const rows: TelegramInlineKeyboardMarkup["inline_keyboard"] = [];

  for (let i = 0; i < Math.min(suggestedActions.length, 3); i++) {
    const action = suggestedActions[i];
    // Telegram caps button text at ~64 chars; truncate gracefully.
    const text = action.length > 60 ? action.slice(0, 57) + "…" : action;
    rows.push([
      { text: `→ ${text}`, callback_data: `act:${briefingId}:${i}` },
    ]);
  }

  rows.push([
    { text: "Open dashboard", url: `${base}/dashboard` },
    { text: "Pause", callback_data: "briefing:pause" },
  ]);

  return { inline_keyboard: rows };
}

interface SendBriefingArgs {
  chatId: number;
  body: string;
  briefingId?: string;
  suggestedActions?: string[];
}

export async function sendBriefingMessage({
  chatId,
  body,
  briefingId,
  suggestedActions,
}: SendBriefingArgs) {
  return sendMessage({
    chat_id: chatId,
    text: briefingToMd2(body),
    parse_mode: "MarkdownV2",
    reply_markup: briefingId
      ? morningBriefingKeyboard(briefingId, suggestedActions ?? [])
      : { inline_keyboard: [[{ text: "Open dashboard", url: `${env.appUrl}/dashboard` }]] },
    disable_web_page_preview: true,
  });
}

export async function editBriefingMessage({
  chatId,
  messageId,
  body,
  briefingId,
  suggestedActions,
}: {
  chatId: number;
  messageId: number;
  body: string;
  briefingId?: string;
  suggestedActions?: string[];
}) {
  return editMessageText({
    chat_id: chatId,
    message_id: messageId,
    text: briefingToMd2(body),
    parse_mode: "MarkdownV2",
    reply_markup: briefingId
      ? morningBriefingKeyboard(briefingId, suggestedActions ?? [])
      : { inline_keyboard: [[{ text: "Open dashboard", url: `${env.appUrl}/dashboard` }]] },
    disable_web_page_preview: true,
  });
}

export async function sendPlainText(chatId: number, text: string) {
  return sendMessage({
    chat_id: chatId,
    text: escapeMd2(text),
    parse_mode: "MarkdownV2",
    disable_web_page_preview: true,
  });
}

// ─── Evening recap ─────────────────────────────────────────────────────────

interface EveningRecapArgs {
  chatId: number;
  ownerName: string | null;
  todayClasses: Array<{ timeLocal: string; type: string | null; staff: string | null }>;
  recapId: string;
  eventsLabel: string;
}

function eveningRecapKeyboard(recapId: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "✓ All as planned", callback_data: `eve:ok:${recapId}` }],
      [{ text: "Tell StarUp what changed →", callback_data: `eve:edit:${recapId}` }],
    ],
  };
}

export async function sendEveningRecap({
  chatId,
  ownerName,
  todayClasses,
  recapId,
  eventsLabel,
}: EveningRecapArgs) {
  const lines: string[] = [];
  lines.push(`Hi ${ownerName ?? "there"} — how did today go?`);
  lines.push("");
  if (todayClasses.length === 0) {
    lines.push(`No ${eventsLabel} scheduled today.`);
  } else {
    lines.push(`Today's ${eventsLabel}:`);
    for (const c of todayClasses) {
      const parts = [c.timeLocal];
      if (c.type) parts.push(c.type);
      if (c.staff) parts.push(`with ${c.staff}`);
      lines.push(`• ${parts.join(" ")}`);
    }
  }
  const text = lines.join("\n");
  return sendMessage({
    chat_id: chatId,
    text: escapeMd2(text),
    parse_mode: "MarkdownV2",
    reply_markup: eveningRecapKeyboard(recapId),
    disable_web_page_preview: true,
  });
}
