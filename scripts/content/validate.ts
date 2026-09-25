/**
 * npm run content:validate [-- --only <slug-or-path-fragment>] [--quick] [--root <content dir>]
 *
 * 1. Loads content/ and reports structural problems (schemas, numbering, links).
 * 2. Runs every drill in real Pyodide (the same runtime learners use):
 *    - the solution must pass every test,
 *    - the starter must fail at least one (otherwise the drill tests nothing),
 *    - predict drills must run cleanly and print something.
 * 3. Runs every runnable lesson example and warns about ones that raise.
 *
 * Exits 1 on any error. --quick skips steps 2 and 3.
 */

import path from "node:path";
import { loadContent } from "../../lib/content/load";
import { NOT_IMPORTED_TYPES, type ContentExercise, type ContentIssue } from "../../lib/content/schema";
import { isBrowserRunnable } from "../../lib/content/runnable";
// @ts-expect-error: plain ES module without types
import { PyodidePool } from "./pyodide-pool.mjs";

type TestResult = {
  status: string;
  phase?: string;
  error?: { type: string; message: string; traceback: string } | null;
  tests?: Array<{ name: string; passed: boolean; message: string | null }>;
  passed?: boolean;
  stdout?: string;
  __timeout?: boolean;
  __failure?: string;
};

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;
const quick = args.includes("--quick");
const contentRoot = args.includes("--root") ? path.resolve(args[args.indexOf("--root") + 1]!) : undefined;
const root = process.cwd();

const color = (code: number) => (s: string) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = color(31);
const yellow = color(33);
const green = color(32);
const dim = color(2);

function describe(r: TestResult): string {
  if (r.__timeout) return "timed out";
  if (r.__failure) return `runtime failure: ${r.__failure}`;
  if (r.status === "error") {
    const where = r.phase === "tests" ? "tests.py" : "the code";
    return `${where} raised ${r.error?.type}: ${r.error?.message}\n${dim(r.error?.traceback ?? "")}`;
  }
  const failed = (r.tests ?? []).filter((t) => !t.passed);
  return failed.map((t) => `✗ ${t.name}: ${t.message}`).join("\n");
}

async function main() {
  const started = Date.now();
  const { tracks, issues } = loadContent(contentRoot ?? path.join(root, "content"));

  // --only takes a module, lesson or drill slug (exact), or a path fragment containing "/"
  const scopes: string[] = [];
  const inScope = (p: string) => !only || scopes.some((s) => p.startsWith(s) || p.includes(s));
  if (only) {
    for (const t of tracks)
      for (const m of t.modules) {
        if (m.slug === only) scopes.push(m.path);
        for (const l of m.lessons) {
          if (l.slug !== only) continue;
          scopes.push(l.path);
          for (const s of [...l.exercises, ...l.optional]) {
            const ex = m.exercises.get(s);
            if (ex) scopes.push(ex.path);
          }
        }
        for (const ex of m.exercises.values()) if (ex.slug === only) scopes.push(ex.path);
      }
    if (only.includes("/")) scopes.push(only);
    if (scopes.length === 0) {
      console.error(`--only ${only}: no module, lesson or drill has that slug`);
      process.exit(1);
    }
  }

  const exercises: ContentExercise[] = [];
  const examples: Array<{ path: string; code: string; index: number; raises: boolean }> = [];
  for (const t of tracks) {
    for (const m of t.modules) {
      for (const ex of m.exercises.values()) {
        if (inScope(ex.path)) exercises.push(ex);
      }
      for (const l of m.lessons) {
        if (!inScope(l.path)) continue;
        let index = 0;
        for (const match of l.body.matchAll(/```python([^\n]*)\n([\s\S]*?)```/g)) {
          index++;
          const meta = match[1]!.trim();
          const code = match[2]!;
          if (meta.includes("norun") || !isBrowserRunnable(code)) continue;
          examples.push({ path: l.path, code, index, raises: meta.includes("raises") });
        }
      }
    }
  }
  const runIssues: ContentIssue[] = [];
  if (!quick && (exercises.length > 0 || examples.length > 0)) {
    const pool = new PyodidePool({ root });
    let done = 0;
    const total = exercises.length + examples.length;
    const tick = () => {
      done++;
      if (process.stdout.isTTY) process.stdout.write(`\r${dim(`Running drills and examples… ${done}/${total}`)}`);
    };

    const checks = exercises.map(async (ex) => {
      const budget = ex.timeout * 1000 + (ex.packages.length > 0 ? 30_000 : 5_000);
      if (ex.type === "predict") {
        const r = (await pool.run({ kind: "run", code: ex.starter, packages: ex.packages }, budget)) as TestResult;
        tick();
        if (r.__timeout || r.__failure || r.status !== "ok")
          runIssues.push({ level: "error", path: ex.path, message: `predict code doesn't run cleanly: ${describe(r)}` });
        else if (!r.stdout?.trim())
          runIssues.push({ level: "error", path: ex.path, message: "predict code prints nothing" });
        return;
      }
      const importSolution = !NOT_IMPORTED_TYPES.has(ex.type);
      const [good, bad] = (await Promise.all([
        pool.run({ kind: "test", solution: ex.solution, tests: ex.tests, importSolution, packages: ex.packages }, budget),
        pool.run({ kind: "test", solution: ex.starter, tests: ex.tests, importSolution, packages: ex.packages }, budget),
      ])) as [TestResult, TestResult];
      tick();
      if (!(good.status === "ok" && good.passed)) {
        runIssues.push({ level: "error", path: ex.path, message: `solution.py doesn't pass its tests:\n${describe(good)}` });
      } else if ((good.tests ?? []).length < 3) {
        runIssues.push({ level: "warning", path: ex.path, message: `only ${good.tests?.length} test(s); aim for 3–8` });
      }
      if (bad.status === "ok" && bad.passed) {
        runIssues.push({ level: "error", path: ex.path, message: "starter.py passes every test, so the drill tests nothing" });
      } else if (bad.status === "error" && bad.phase === "tests") {
        runIssues.push({
          level: "error",
          path: ex.path,
          message: `tests.py crashes against the starter (tests must fail cleanly, not error):\n${describe(bad)}`,
        });
      }
    });

    const exampleChecks = examples.map(async (ex) => {
      const r = (await pool.run({ kind: "run", code: ex.code, scanImports: ex.code }, 20_000)) as TestResult;
      tick();
      const where = `${ex.path} (python block ${ex.index})`;
      if (r.__timeout || r.__failure) {
        runIssues.push({ level: "warning", path: where, message: `example ${describe(r)}` });
      } else if (ex.raises && r.status === "ok") {
        runIssues.push({ level: "warning", path: where, message: "marked `python raises` but runs without an error" });
      } else if (!ex.raises && r.status !== "ok") {
        runIssues.push({
          level: "warning",
          path: where,
          message: `example raises when run (mark it \`python raises\` if that's the point, or \`python norun\`): ${describe(r).split("\n")[0]}`,
        });
      }
    });

    await Promise.all([...checks, ...exampleChecks]);
    await pool.close();
    if (process.stdout.isTTY) process.stdout.write("\r\x1b[K");
  }

  const all = [...issues.filter((i) => inScope(i.path)), ...runIssues];
  const errors = all.filter((i) => i.level === "error");
  const warnings = all.filter((i) => i.level === "warning");
  for (const i of [...errors, ...warnings]) {
    const tag = i.level === "error" ? red("error") : yellow("warn ");
    console.log(`${tag} ${i.path}\n      ${i.message.split("\n").join("\n      ")}`);
  }

  const counts = tracks.map(
    (t) =>
      `${t.slug}: ${t.modules.length} modules, ${t.modules.reduce((n, m) => n + m.lessons.length, 0)} lessons, ` +
      `${t.modules.reduce((n, m) => n + m.exercises.size, 0)} drills`
  );
  console.log(dim(counts.join(" · ")));
  const summary = `${errors.length} error(s), ${warnings.length} warning(s)` +
    (quick ? "" : `, ${exercises.length} drills and ${examples.length} examples run`) +
    ` in ${((Date.now() - started) / 1000).toFixed(1)}s`;
  console.log(errors.length ? red(summary) : green(summary));
  process.exit(errors.length ? 1 : 0);
}

void main();
