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

import { ilike, eq, desc } from "drizzle-orm";
import { getDb, schema } from "../lib/db/client";

async function main() {
  const q = process.argv[2] ?? "Ket";
  const db = getDb();
  const tenants = await db
    .select()
    .from(schema.tenants)
    .where(ilike(schema.tenants.name, `%${q}%`));
  if (tenants.length === 0) {
    console.log(`No tenant matching "${q}".`);
    return;
  }
  for (const t of tenants) {
    console.log("───────────────────────────");
    console.log("Tenant:", t.name, t.id);
    console.log("  status:", t.status);
    console.log("  timezone:", t.timezone);
    console.log("  briefing:", t.briefingLocalTime, "evening:", t.eveningRecapTime);

    const [owner] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.tenantId, t.id))
      .limit(1);
    console.log("  owner:", owner?.email, owner?.fullName ?? "(no name)");
    console.log("  telegramChatId:", owner?.telegramChatId ?? "NOT LINKED");

    const peopleCount = await db.$count(schema.people, eq(schema.people.tenantId, t.id));
    const eventCount = await db.$count(schema.events, eq(schema.events.tenantId, t.id));
    const paymentCount = await db.$count(schema.payments, eq(schema.payments.tenantId, t.id));
    console.log(`  data: ${peopleCount} people · ${eventCount} events · ${paymentCount} payments`);

    const recentBriefings = await db
      .select()
      .from(schema.briefings)
      .where(eq(schema.briefings.tenantId, t.id))
      .orderBy(desc(schema.briefings.generatedAt))
      .limit(5);
    if (recentBriefings.length === 0) {
      console.log("  briefings: none yet");
    } else {
      console.log("  recent briefings:");
      for (const b of recentBriefings) {
        const acts = Array.isArray(b.suggestedActions)
          ? (b.suggestedActions as string[]).length
          : 0;
        console.log(
          `    · ${b.forDate} ${b.kind} · ${b.status} · actions=${acts} · ${b.telegramMessageId ?? "no msg"}`
        );
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
