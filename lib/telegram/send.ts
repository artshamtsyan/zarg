import { editMessageText, sendMessage, type TelegramInlineKeyboardMarkup } from "./client";
import { briefingToMd2, escapeMd2 } from "./markdown";
import { env } from "@/lib/env";

function briefingKeyboard(): TelegramInlineKeyboardMarkup {
  const base = env.appUrl;
  return {
    inline_keyboard: [
      [
        { text: "Open dashboard", url: `${base}/dashboard` },
        { text: "Regenerate", callback_data: "briefing:regenerate" },
      ],
      [{ text: "Pause briefings", callback_data: "briefing:pause" }],
    ],
  };
}

interface SendBriefingArgs {
  chatId: number;
  body: string;
}

export async function sendBriefingMessage({ chatId, body }: SendBriefingArgs) {
  return sendMessage({
    chat_id: chatId,
    text: briefingToMd2(body),
    parse_mode: "MarkdownV2",
    reply_markup: briefingKeyboard(),
    disable_web_page_preview: true,
  });
}

export async function editBriefingMessage({
  chatId,
  messageId,
  body,
}: {
  chatId: number;
  messageId: number;
  body: string;
}) {
  return editMessageText({
    chat_id: chatId,
    message_id: messageId,
    text: briefingToMd2(body),
    parse_mode: "MarkdownV2",
    reply_markup: briefingKeyboard(),
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
