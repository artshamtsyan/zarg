import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Lightweight .env.local loader so drizzle-kit picks up DATABASE_URL
// without requiring dotenv as a dep.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
for (const file of [".env.local", ".env"]) {
  try {
    const text = readFileSync(resolve(here, file), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
      }
    }
  } catch {
    // ignore
  }
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost/zarg",
  },
  strict: true,
  verbose: true,
});
