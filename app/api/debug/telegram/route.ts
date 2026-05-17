// Temporary debug route — confirms what env vars the Vercel runtime is
// actually reading. Returns only metadata, never the full secret.
// Remove this route after debugging.

import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const username = process.env.TELEGRAM_BOT_USERNAME;

  return Response.json({
    nodeEnv: process.env.NODE_ENV,
    hasTelegram: env.hasTelegram(),
    tokenSet: Boolean(token),
    tokenLength: token?.length ?? 0,
    secretSet: Boolean(secret),
    secretLength: secret?.length ?? 0,
    secretPrefix: secret?.slice(0, 6) ?? null,
    secretSuffix: secret?.slice(-4) ?? null,
    usernameSet: Boolean(username),
    usernameValue: username ?? null,
  });
}
