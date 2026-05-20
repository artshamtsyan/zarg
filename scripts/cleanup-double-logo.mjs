// Strip the orphan <LogoMark className="h-5 w-5 text-outline-blue" />
// that the earlier rebrand sweep left sitting before the proper wordmark
// + mark composite. Idempotent.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      yield* walk(p);
    } else if (name.endsWith(".tsx")) {
      yield p;
    }
  }
}

const ORPHAN_RE = /\s*<LogoMark className="h-5 w-5 text-outline-blue" \/>\n/g;

let changed = 0;
for (const file of walk(join(ROOT, "app"))) {
  let src = readFileSync(file, "utf8");
  const before = src;
  src = src.replace(ORPHAN_RE, "\n");
  if (src !== before) {
    writeFileSync(file, src);
    changed++;
    console.log("cleaned:", file.replace(ROOT, ""));
  }
}
console.log(`Done. ${changed} files cleaned.`);
