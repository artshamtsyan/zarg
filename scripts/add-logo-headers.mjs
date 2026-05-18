// One-shot script: replace the plain "StarUp" wordmark in headers
// with the LogoMark + wordmark across every page. Idempotent — running
// it twice doesn't double-stamp.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      yieldFromOf(walk(p));
    } else if (name.endsWith(".tsx")) {
      visit(p);
    }
  }
}

// Workaround for generators in a top-level script
function* walkGen(dir) {
  const entries = readdirSync(dir);
  for (const name of entries) {
    const p = join(dir, name);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      yield* walkGen(p);
    } else if (name.endsWith(".tsx")) {
      yield p;
    }
  }
}

function visit(p) {}
function yieldFromOf() {}

const linkRe =
  /<Link href="\/"\s+className="text-\[20px\] font-semibold tracking-tight text-ink">\s*StarUp\s*<\/Link>/g;
const spanRe =
  /<span className="text-\[20px\] font-semibold tracking-tight text-ink">StarUp<\/span>/g;

let changed = 0;
for (const file of walkGen(join(ROOT, "app"))) {
  let src = readFileSync(file, "utf8");
  const before = src;

  if (linkRe.test(src) || spanRe.test(src)) {
    if (!src.includes("LogoMark")) {
      // Add import after the first import line
      src = src.replace(
        /(import [^;]*?;\n)/,
        `$1import { LogoMark } from "@/components/ui/Logo";\n`
      );
    }
    linkRe.lastIndex = 0;
    spanRe.lastIndex = 0;
    src = src.replace(
      linkRe,
      `<Link href="/" className="inline-flex items-center gap-2">\n            <LogoMark className="h-5 w-5 text-outline-blue" />\n            <span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span>\n          </Link>`
    );
    src = src.replace(
      spanRe,
      `<span className="inline-flex items-center gap-2"><LogoMark className="h-5 w-5 text-outline-blue" /><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span></span>`
    );
  }

  if (src !== before) {
    writeFileSync(file, src);
    changed++;
    console.log("changed:", file.replace(ROOT, ""));
  }
}
console.log(`Done. ${changed} files updated.`);
