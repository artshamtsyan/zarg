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

import { eq, isNotNull } from "drizzle-orm";
import { getDb, schema } from "../lib/db/client";

async function main() {
  const db = getDb();
  const before = await db
    .select({ id: schema.users.id, email: schema.users.email, chat: schema.users.telegramChatId })
    .from(schema.users)
    .where(isNotNull(schema.users.telegramChatId));
  console.log(`Found ${before.length} user(s) with a Telegram link:`);
  for (const u of before) console.log(`  · ${u.email} → chat ${u.chat}`);

  if (before.length === 0) return;

  for (const u of before) {
    await db
      .update(schema.users)
      .set({
        telegramChatId: null,
        telegramLinkCode: null,
        telegramLinkExpiresAt: null,
      })
      .where(eq(schema.users.id, u.id));
  }
  console.log(`Cleared ${before.length} Telegram linkages. Users will need to re-link via /dashboard/telegram.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
