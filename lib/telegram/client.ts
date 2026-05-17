import { env } from "@/lib/env";

const TELEGRAM_API = "https://api.telegram.org";

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

interface SendMessageParams {
  chat_id: number | string;
  text: string;
  parse_mode?: "MarkdownV2" | "HTML";
  reply_markup?: TelegramInlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
}

interface EditMessageTextParams {
  chat_id: number | string;
  message_id: number;
  text: string;
  parse_mode?: "MarkdownV2" | "HTML";
  reply_markup?: TelegramInlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
}

interface AnswerCallbackQueryParams {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

async function tgRequest<T = unknown>(method: string, params: object): Promise<T> {
  if (!env.hasTelegram()) {
    throw new Error("Telegram is not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET).");
  }
  const token = env.telegramBotToken();
  const url = `${TELEGRAM_API}/bot${token}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = (await res.json()) as TelegramApiResponse<T>;
  if (!json.ok) {
    throw new Error(`Telegram ${method} failed: ${json.description ?? res.statusText}`);
  }
  return json.result as T;
}

export interface TelegramSentMessage {
  message_id: number;
  chat: { id: number };
}

export function sendMessage(params: SendMessageParams) {
  return tgRequest<TelegramSentMessage>("sendMessage", params);
}

export function editMessageText(params: EditMessageTextParams) {
  return tgRequest<TelegramSentMessage>("editMessageText", params);
}

export function answerCallbackQuery(params: AnswerCallbackQueryParams) {
  return tgRequest<boolean>("answerCallbackQuery", params);
}

export interface BotCommand {
  command: string;
  description: string;
}

export function setMyCommands(commands: BotCommand[]) {
  return tgRequest<boolean>("setMyCommands", { commands });
}

export function setWebhook(params: {
  url: string;
  secret_token: string;
  allowed_updates?: string[];
  drop_pending_updates?: boolean;
}) {
  return tgRequest<boolean>("setWebhook", params);
}

export function deleteWebhook() {
  return tgRequest<boolean>("deleteWebhook", {});
}

export function getMe() {
  return tgRequest<{ id: number; username: string; first_name: string }>("getMe", {});
}
