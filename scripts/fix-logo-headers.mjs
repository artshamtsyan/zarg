// Update existing headers to match the official brand artwork:
// wordmark FIRST, then the orange-star + blue-arrow mark.
//
// Replaces:
//   <Link href="/" className="inline-flex items-center gap-2">
//     <LogoMark className="h-5 w-5 text-outline-blue" />
//     <span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span>
//   </Link>
// With:
//   <Link href="/" className="inline-flex items-center gap-2">
//     <span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span>
//     <LogoMark className="h-4 w-auto" />
//   </Link>
//
// Same for the <span>-wrapped variant on the landing page.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

function* walkGen(dir) {
  for (const name of readdirSync(dir)) {
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

// Loose patterns — match flexible whitespace.
const linkPattern =
  /<Link href="\/" className="inline-flex items-center gap-2">\s*<LogoMark className="h-5 w-5 text-outline-blue" \/>\s*<span className="text-\[20px\] font-semibold tracking-tight text-ink">StarUp<\/span>\s*<\/Link>/g;

const spanPattern =
  /<span className="inline-flex items-center gap-2"><LogoMark className="h-5 w-5 text-outline-blue" \/><span className="text-\[20px\] font-semibold tracking-tight text-ink">StarUp<\/span><\/span>/g;

const linkReplacement = `<Link href="/" className="inline-flex items-center gap-2">\n            <span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span>\n            <LogoMark className="h-4 w-auto" />\n          </Link>`;

const spanReplacement = `<span className="inline-flex items-center gap-2"><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span><LogoMark className="h-4 w-auto" /></span>`;

let changed = 0;
for (const file of walkGen(join(ROOT, "app"))) {
  let src = readFileSync(file, "utf8");
  const before = src;
  src = src.replace(linkPattern, linkReplacement);
  src = src.replace(spanPattern, spanReplacement);
  if (src !== before) {
    writeFileSync(file, src);
    changed++;
    console.log("flipped:", file.replace(ROOT, ""));
  }
}
console.log(`Done. ${changed} files updated.`);
