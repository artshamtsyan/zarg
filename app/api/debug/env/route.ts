// Temporary diagnostic — returns metadata about which env vars the
// Vercel runtime is actually seeing. Never returns full secret values.
// Remove after debugging.

import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function probe(name: string) {
  const v = process.env[name];
  return {
    set: Boolean(v),
    length: v?.length ?? 0,
    prefix: v?.slice(0, 6) ?? null,
  };
}

export async function GET() {
  return Response.json({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    starupHostname: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    service: {
      database: probe("DATABASE_URL"),
      authSecret: probe("AUTH_SECRET"),
      authUrl: probe("AUTH_URL"),
      appUrl: probe("APP_URL"),
      anthropic: probe("ANTHROPIC_API_KEY"),
      resendKey: probe("RESEND_API_KEY"),
      resendFrom: probe("RESEND_FROM"),
      telegramToken: probe("TELEGRAM_BOT_TOKEN"),
      telegramSecret: probe("TELEGRAM_WEBHOOK_SECRET"),
      telegramUsername: probe("TELEGRAM_BOT_USERNAME"),
      authDevBackdoor: probe("AUTH_DEV_BACKDOOR"),
    },
    aggregate: {
      hasDatabase: env.hasDatabaseUrl(),
      hasAuth: env.hasAuthSecret(),
      hasResend: env.hasResend(),
      hasAnthropic: env.hasAnthropic(),
      hasTelegram: env.hasTelegram(),
    },
  });
}
