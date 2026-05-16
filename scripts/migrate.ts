import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

// Load env.local
for (const file of [".env.local", ".env"]) {
  try {
    const text = readFileSync(resolve(root, file), "utf8");
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

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in .env.local.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  console.log("Connecting to Postgres…");

  // Create migrations tracking table
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS __zarg_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const dir = resolve(root, "drizzle");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const f of files) {
    const id = f;
    const already = await sql<{ id: string }[]>`SELECT id FROM __zarg_migrations WHERE id = ${id}`;
    if (already.length > 0) {
      console.log(`✓ ${id} (already applied)`);
      continue;
    }
    const text = readFileSync(resolve(dir, f), "utf8");
    // Drizzle uses "--> statement-breakpoint" between statements; split on it.
    const statements = text
      .split(/-->\s*statement-breakpoint/)
      .map((s) => s.trim())
      .filter(Boolean);
    console.log(`→ Applying ${id} (${statements.length} statements)`);
    await sql.begin(async (tx) => {
      for (const stmt of statements) {
        await tx.unsafe(stmt);
      }
      await tx`INSERT INTO __zarg_migrations (id) VALUES (${id})`;
    });
    console.log(`✓ Applied ${id}`);
  }

  console.log("All migrations applied.");
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
