import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
for (const file of [".env.local", ".env"]) {
  try {
    const text = readFileSync(resolve(root, file), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  } catch {}
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_URL = process.env.APP_URL ?? process.argv[2];

if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN missing — add to .env.local first.");
  process.exit(1);
}
if (!SECRET) {
  console.error("TELEGRAM_WEBHOOK_SECRET missing — add to .env.local first.");
  process.exit(1);
}
if (!APP_URL) {
  console.error("APP_URL missing — set it in .env.local OR pass as argv: npx tsx scripts/register-webhook.ts https://your.vercel.app");
  process.exit(1);
}

const webhookUrl = `${APP_URL.replace(/\/$/, "")}/api/telegram/webhook`;
const url = `https://api.telegram.org/bot${TOKEN}/setWebhook`;

async function main() {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: SECRET,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    }),
  });
  const json = await res.json();
  if (!json.ok) {
    console.error("Failed:", json);
    process.exit(1);
  }
  console.log(`Webhook registered: ${webhookUrl}`);
  console.log("Response:", json);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
