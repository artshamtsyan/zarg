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
if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN missing — add to .env.local first.");
  process.exit(1);
}

const commands = [
  { command: "preview", description: "Generate today's briefing now" },
  { command: "pause", description: "Stop daily briefings" },
  { command: "resume", description: "Turn daily briefings back on" },
];

async function main() {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands }),
  });
  const json = await res.json();
  console.log(json.ok ? `Set ${commands.length} commands.` : json);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
