// Debug helper: run one drill's starter (or solution) and print exactly what a
// learner would see.  node scripts/content/try-drill.mjs <exercise dir> [--solution]

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { PyodidePool } from "./pyodide-pool.mjs";

const dir = path.resolve(process.argv[2] ?? ".");
const useSolution = process.argv.includes("--solution");
const read = (name) => readFileSync(path.join(dir, name), "utf8");
const meta = parse(read("exercise.yaml"));
const code = read(useSolution ? "solution.py" : "starter.py");

const pool = new PyodidePool({ root: process.cwd(), size: 1 });
const result =
  meta.type === "predict"
    ? await pool.run({ kind: "run", code, packages: meta.packages ?? [] }, 60_000)
    : await pool.run(
        {
          kind: "test",
          solution: code,
          tests: existsSync(path.join(dir, "tests.py")) ? read("tests.py") : "",
          importSolution: !["program", "tests"].includes(meta.type),
          packages: meta.packages ?? [],
        },
        (meta.timeout ?? 5) * 1000 + 30_000
      );
await pool.close();

if (result.__timeout) console.log("TIMEOUT");
else if (meta.type === "predict") console.log(result.stdout || result.error);
else {
  if (result.error) console.log(`${result.phase} error:\n${result.error.traceback}`);
  for (const t of result.tests ?? []) {
    console.log(`${t.passed ? "✓" : "✗"} ${t.name}${t.hidden ? " (hidden)" : ""}${t.message ? `\n    ${t.message}` : ""}`);
  }
}
