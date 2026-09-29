// Authoring helper: split one bundle file into many files.
// Each file in the bundle starts with a line "=== relative/path".
//
//   node scripts/content/unbundle.mjs drills.bundle content/tracks/python/05-oop/exercises

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [bundle, base] = process.argv.slice(2);
if (!bundle || !base) {
  console.error("usage: node scripts/content/unbundle.mjs <bundle file> <base dir>");
  process.exit(1);
}
const parts = readFileSync(bundle, "utf8").replace(/\r\n/g, "\n").split(/^=== (.+)$/m);
let count = 0;
for (let i = 1; i < parts.length; i += 2) {
  const file = path.join(base, parts[i].trim());
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, parts[i + 1].replace(/^\n/, "").replace(/\n+$/, "\n"));
  count++;
}
console.log(`wrote ${count} files under ${base}`);
