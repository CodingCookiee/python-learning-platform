/**
 * Check acceptance suites (capstones) and github-lab checks on this machine, the
 * way GitHub Actions will run them in a learner's repo:
 *
 *   npm run content:acceptance                 every suite
 *   npm run content:acceptance -- --only receipt-printer      one capstone or lab (slug)
 *
 * Each suite must pass against its reference/ solution and must not pass against an
 * empty project (a suite that passes with no code tests nothing). Needs Python 3.11+
 * on PATH; packages install into cached venvs under .cache/acceptance-venvs/.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadContent, readTree } from "../../lib/content/load";
import { PYTEST_ARGS, runnerFiles } from "../../lib/ci/workflow";

interface Target {
  kind: "capstone" | "lab";
  slug: string;
  path: string;
  suite: Record<string, string>;
  requirements: string[];
  reference: Record<string, string> | null;
}

interface RunResult {
  ok: boolean;
  tests: Array<{ name: string; outcome: string; message: string }>;
  log: string;
}

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;
const root = path.join(process.cwd(), "content");
const { tracks } = loadContent(root);

const targets: Target[] = [];
for (const t of tracks) {
  for (const m of t.modules) {
    if (m.capstone?.suite) {
      targets.push({
        kind: "capstone",
        slug: m.capstone.slug,
        path: m.capstone.path,
        suite: m.capstone.suite,
        requirements: m.capstone.acceptance.requirements,
        reference: m.capstone.reference,
      });
    }
    for (const l of m.lessons) {
      if (l.lab?.kind === "github" && l.lab.suite) {
        targets.push({
          kind: "lab",
          slug: l.slug,
          path: l.path,
          suite: l.lab.suite,
          requirements: l.lab.requirements,
          reference: readTree(path.join(root, "..", m.path, "labs", l.slug, "reference")),
        });
      }
    }
  }
}

function runSuite(target: Target, project: Record<string, string> | null): RunResult {
  const dir = mkdtempSync(path.join(os.tmpdir(), "pylearn-acceptance-"));
  try {
    const write = (rel: string, content: string) => {
      const full = path.join(dir, rel);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, content);
    };
    for (const [p, c] of Object.entries(project ?? {})) write(p, c);
    for (const [p, c] of Object.entries({ ...target.suite, ...runnerFiles() })) write(path.join(".pylearn", p), c);
    const py = spawnSync(
      process.platform === "win32" ? "python" : "python3",
      [path.join("scripts", "content", "run_acceptance.py"), dir, JSON.stringify(["pytest", ...target.requirements]), JSON.stringify(PYTEST_ARGS)],
      { encoding: "utf8", timeout: 15 * 60_000 }
    );
    const line = py.stdout.trim().split("\n").at(-1) ?? "";
    try {
      return JSON.parse(line) as RunResult;
    } catch {
      return { ok: false, tests: [], log: `${py.stdout}\n${py.stderr}`.slice(-3000) };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const selected = targets.filter((t) => !only || t.slug === only || t.path.includes(only));
if (selected.length === 0) {
  console.log(only ? `No acceptance suite matches "${only}".` : "No acceptance suites yet.");
  process.exit(only ? 1 : 0);
}

let problems = 0;
for (const t of selected) {
  const label = `${t.kind} ${t.slug}`;
  if (!t.reference) {
    problems++;
    console.log(`✗ ${label}: no reference/ solution to check the suite against`);
    continue;
  }
  const good = runSuite(t, t.reference);
  const failing = good.tests.filter((x) => x.outcome !== "passed");
  if (!good.ok || good.tests.length === 0 || failing.length > 0) {
    problems++;
    console.log(`✗ ${label}: the reference solution doesn't pass`);
    for (const f of failing) console.log(`    ${f.name}: ${f.message.split("\n")[0]}`);
    if (good.tests.length === 0) console.log(good.log.split("\n").slice(-25).join("\n"));
    continue;
  }
  const empty = runSuite(t, null);
  const passedEmpty = empty.tests.filter((x) => x.outcome === "passed");
  if (empty.ok || passedEmpty.length > 0) {
    problems++;
    console.log(`✗ ${label}: ${passedEmpty.length} test(s) pass with no project at all: ${passedEmpty.map((p) => p.name).join(", ")}`);
    continue;
  }
  const few = good.tests.length < 5 ? `  (only ${good.tests.length} tests; aim for 8 or more)` : "";
  console.log(`✓ ${label}: ${good.tests.length} tests pass on the reference, none on an empty project${few}`);
}
console.log(problems === 0 ? `\n${selected.length} suite(s) OK` : `\n${problems} problem(s)`);
process.exit(problems === 0 ? 0 : 1);
