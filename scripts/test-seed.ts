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

import { generateSeed } from "../lib/ai/seed";

async function main() {
  const result = await generateSeed({
    tenant: { name: "Avan Yoga", domain: "yoga", location: "Yerevan, Armenia" },
    profile: {
      entities: { events_label: "classes", people_label: "students" },
      goals: ["increase retention", "convert trials to packages"],
      keyWorkflows: [{ name: "Daily class booking", steps: ["check WhatsApp", "log in sheet"] }],
    },
  });
  console.log("Source:", result.source);
  console.log("People:", result.payload.people.length);
  console.log("Events:", result.payload.events.length);
  console.log("Bookings:", result.payload.bookings.length);
  console.log("Payments:", result.payload.payments.length);
  console.log("Packages:", result.payload.packages.length);
  console.log("\nFirst 3 people:", result.payload.people.slice(0, 3));
  console.log("\nFirst 3 events:", result.payload.events.slice(0, 3));
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? `${e.name}: ${e.message}\n${e.stack}` : JSON.stringify(e, null, 2));
  process.exit(1);
});
