import path from "node:path";
import { pathToFileURL } from "node:url";
import { env } from "@/lib/env";

/**
 * Server-side grading (GRADING_MODE=server). The browser grades a drill for instant
 * feedback, but in server mode its verdict isn't trusted: the submit route re-runs
 * the drill's tests here, in the same Pyodide and plp harness, using the pool that
 * content:validate runs on (scripts/content/pyodide-pool.mjs). One pool per server
 * process, started on first use.
 */

export function isServerGrading(): boolean {
  return env().GRADING_MODE === "server";
}

interface PoolJob {
  kind: "run" | "test";
  code?: string;
  solution?: string;
  tests?: string;
  importSolution?: boolean;
  packages?: string[];
}

interface RawResult {
  status?: string;
  phase?: string;
  passed?: boolean;
  stdout?: string;
  error?: { type: string; message: string } | null;
  tests?: Array<{ name: string; passed: boolean; message: string | null }>;
  __timeout?: boolean;
  __failure?: string;
}

interface Pool {
  run(message: PoolJob, timeoutMs: number): Promise<RawResult>;
}

const g = globalThis as { __plpGradingPool?: Promise<Pool> };

function pool(): Promise<Pool> {
  g.__plpGradingPool ??= (async () => {
    const root = process.cwd();
    // Loaded as plain Node ESM, not bundled: the pool starts worker threads by file path
    const href = pathToFileURL(path.join(root, "scripts", "content", "pyodide-pool.mjs")).href;
    const mod = (await import(/* webpackIgnore: true */ href)) as {
      PyodidePool: new (opts: { root: string; size: number; cacheDir?: string }) => Pool;
    };
    return new mod.PyodidePool({
      root,
      size: Number(process.env.GRADING_POOL_SIZE) || 1,
      cacheDir: process.env.PLP_CACHE_DIR || (process.env.VERCEL ? "/tmp/pyodide" : undefined),
    });
  })();
  return g.__plpGradingPool;
}

/** The same comparison the drill page uses: trailing spaces and trailing blank lines don't count */
export function normaliseOutput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n+$/, "");
}

export interface DrillToGrade {
  type: string;
  starterCode: string;
  tests: string;
  testCases: string;
  packages: string[];
  timeoutMs: number;
  importSolution: boolean;
}

export type ServerVerdict =
  | { graded: true; passed: boolean; summary: Record<string, unknown> }
  /** The grader itself failed (not the learner's code): nothing should be recorded */
  | { graded: false; reason: string };

function testCount(testCases: string): number {
  try {
    const list = JSON.parse(testCases);
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Grade a submission. For predict drills `submitted` is the learner's predicted
 * output; for everything else it's their code.
 */
export async function gradeOnServer(drill: DrillToGrade, submitted: string): Promise<ServerVerdict> {
  const p = await pool();
  if (drill.type === "predict") {
    const r = await p.run({ kind: "run", code: drill.starterCode, packages: drill.packages }, drill.timeoutMs + 2000);
    if (r.__failure || r.__timeout) return { graded: false, reason: r.__failure ?? "The reference run timed out" };
    const passed = r.status === "ok" && normaliseOutput(submitted) === normaliseOutput(r.stdout ?? "");
    return { graded: true, passed, summary: { kind: "predict", correct: passed, server: true } };
  }

  // Each test has its own limit inside the runner; the whole run gets room for all of them
  const budget = Math.max(drill.timeoutMs, (testCount(drill.testCases) + 1) * 2500) + 2000;
  const r = await p.run(
    { kind: "test", solution: submitted, tests: drill.tests, importSolution: drill.importSolution, packages: drill.packages },
    budget
  );
  if (r.__failure) return { graded: false, reason: r.__failure };
  if (r.__timeout) return { graded: true, passed: false, summary: { status: "timeout", tests: [], server: true } };
  // The drill's own tests failing to load is the platform's problem, not the attempt's
  if (r.status === "error" && r.phase === "tests") return { graded: false, reason: r.error?.message ?? "The drill's tests didn't load" };
  return {
    graded: true,
    passed: r.status === "ok" && r.passed === true,
    summary: {
      status: r.status,
      tests: (r.tests ?? []).map((t) => ({ name: t.name, passed: t.passed })),
      error: r.error ? `${r.error.type}: ${r.error.message}` : null,
      server: true,
    },
  };
}
