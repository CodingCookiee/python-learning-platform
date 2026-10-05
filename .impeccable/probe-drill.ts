// Run one drill's solution and starter (or a variant) and print every check's result.
// npx tsx .impeccable/probe-drill.ts <slug> [variant.json]   variant: {"main": "...", "files": {...}}
import { readFileSync } from "node:fs";
import { loadContent } from "@/lib/content/load";
// @ts-expect-error plain JS module
import { PyodidePool } from "../scripts/content/pyodide-pool.mjs";

const [slug, variantPath] = process.argv.slice(2);
const drill = loadContent()
  .tracks.flatMap((t) => t.modules.flatMap((m) => [...m.exercises.values()]))
  .find((e) => e.slug === slug);
if (!drill) throw new Error(`no drill ${slug}`);

const pool = new PyodidePool({ root: process.cwd(), size: 1 });
const files = (which: "starter" | "solution") =>
  Object.fromEntries(drill.extraFiles.map((f) => [f.path, f[which] ?? f.starter]));

async function show(label: string, main: string, extra: Record<string, string>) {
  const r = await pool.run(
    { kind: "test", solution: main, tests: drill!.tests, files: extra, mainName: drill!.mainFile, packages: drill!.packages, importSolution: drill!.importSolution },
    120_000
  );
  console.log(`\n== ${label}: ${r.status} passed=${r.passed}`);
  if (r.error) console.log(r.error.message, r.error.traceback);
  for (const t of r.tests ?? []) console.log(`${t.passed ? "PASS" : "FAIL"} ${t.hidden ? "(hidden) " : ""}${t.name}${t.passed ? "" : `\n     ${String(t.message ?? t.error?.message ?? "").replace(/\n/g, "\n     ")}`}`);
}

async function main() {
if (variantPath) {
  const v = JSON.parse(readFileSync(variantPath, "utf8"));
  await show("variant", v.main ?? drill.solution, { ...files("solution"), ...(v.files ?? {}) });
} else {
  await show("solution", drill.solution, files("solution"));
  await show("starter", drill.starter, files("starter"));
}
await pool.close();
}
void main();
