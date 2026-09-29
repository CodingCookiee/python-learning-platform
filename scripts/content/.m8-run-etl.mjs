import { readFileSync } from "node:fs";
import { PyodidePool } from "./pyodide-pool.mjs";
const [file, ...args] = process.argv.slice(2);
const code = `import sys\nsys.argv = ${JSON.stringify(["etl.py", ...args])}\n` + readFileSync(file, "utf8");
const pool = new PyodidePool({ root: process.cwd(), size: 1 });
const t = Date.now();
const r = await pool.run({ kind: "run", code, packages: [] }, 590_000);
await pool.close();
console.log(r.__timeout ? "TIMEOUT" : r.stdout, r.error ? JSON.stringify(r.error) : "", `(${(Date.now() - t) / 1000}s)`);
