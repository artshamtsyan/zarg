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

import { eq } from "drizzle-orm";
import { getDb, schema } from "../lib/db/client";
import { generateSeed } from "../lib/ai/seed";
import { insertSeed, countSeed } from "../lib/db/seed";

async function main() {
  const db = getDb();

  // Create a test tenant if not present
  const testName = "Test Seed Studio";
  let [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.name, testName))
    .limit(1);

  if (!tenant) {
    const [created] = await db
      .insert(schema.tenants)
      .values({
        name: testName,
        domain: "yoga",
        location: "Yerevan, Armenia",
        status: "onboarding",
      })
      .returning();
    tenant = created;
    await db
      .insert(schema.businessProfiles)
      .values({
        tenantId: tenant.id,
        entities: { events_label: "classes", people_label: "students" },
        goals: ["increase retention", "convert trials"],
        keyWorkflows: [{ name: "Daily booking via WhatsApp" }],
      })
      .onConflictDoNothing();
  }
  console.log("Tenant:", tenant.name, tenant.id);

  const [profile] = await db
    .select()
    .from(schema.businessProfiles)
    .where(eq(schema.businessProfiles.tenantId, tenant.id))
    .limit(1);

  console.log("Generating seed…");
  const t0 = Date.now();
  const seed = await generateSeed({
    tenant: { name: tenant.name, domain: tenant.domain, location: tenant.location },
    profile: {
      entities: profile?.entities,
      goals: profile?.goals,
      keyWorkflows: profile?.keyWorkflows,
    },
  });
  console.log(`Generated in ${Math.round((Date.now() - t0) / 1000)}s, source=${seed.source}`);
  console.log("Payload sizes:", {
    people: seed.payload.people.length,
    events: seed.payload.events.length,
    bookings: seed.payload.bookings.length,
    payments: seed.payload.payments.length,
    packages: seed.payload.packages.length,
  });

  console.log("Inserting…");
  await insertSeed(tenant.id, seed.payload);

  const counts = await countSeed(tenant.id);
  console.log("DB counts after insert:", counts);

  // Flip tenant to active
  await db.update(schema.tenants).set({ status: "active" }).where(eq(schema.tenants.id, tenant.id));

  process.exit(0);
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? `${e.name}: ${e.message}\n${e.stack}` : JSON.stringify(e, null, 2));
  process.exit(1);
});
