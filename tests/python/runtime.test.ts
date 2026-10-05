import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadContent } from "@/lib/content/load";
import type { ContentExercise } from "@/lib/content/schema";
import { gradeOnServer } from "@/lib/grading/server";
// A plain JS module, shared with content:validate
import { PyodidePool } from "../../scripts/content/pyodide-pool.mjs";

interface RunResult {
  status: string;
  passed?: boolean;
  stdout?: string;
  error?: { message: string; traceback: string } | null;
  tests?: Array<{ passed: boolean; message: string | null; error?: { traceback: string } | null }>;
}
const pool = new PyodidePool({ root: process.cwd(), size: 1 }) as { run(msg: object, ms: number): Promise<RunResult>; close(): Promise<void> };
afterAll(() => pool.close());

describe("multi-file runs", () => {
  const tests = `from plp import test
from solution import order_total

@test("adds tax")
def _():
    assert order_total([10, 20]) == 33.0
`;
  const main = "from pricing import with_tax\n\ndef order_total(prices):\n    return with_tax(sum(prices))\n";

  it("import the learner's other modules", async () => {
    const r = await pool.run({ kind: "test", solution: main, tests, files: { "pricing.py": "def with_tax(x):\n    return round(x * 1.1, 2)\n" }, mainName: "main.py" }, 60_000);
    expect(r.status).toBe("ok");
    expect(r.passed).toBe(true);
  });

  it("name the right file in tracebacks", async () => {
    const r = await pool.run({ kind: "test", solution: main, tests, files: { "pricing.py": "def with_tax(x):\n    return x / 0\n" }, mainName: "main.py" }, 60_000);
    expect(r.tests?.[0]?.error?.traceback).toMatch(/File "main\.py"[\s\S]*File "pricing\.py"/);
  });

  it("time-limit loops in the other files too", async () => {
    const r = await pool.run({ kind: "test", solution: main, tests, files: { "pricing.py": "def with_tax(x):\n    while True:\n        pass\n" }, mainName: "main.py" }, 60_000);
    expect(r.tests?.[0]?.message).toMatch(/longer than/);
  });

  it("support packages and data files, and clean up between runs", async () => {
    const pkg = await pool.run(
      {
        kind: "test",
        solution: "from inventory import reorder\n\ndef low():\n    return reorder({'tea': 1, 'milk': 9})\n",
        tests: "from plp import test\nfrom solution import low\n\n@test('low')\ndef _():\n    assert low() == ['tea']\n",
        files: { "inventory/__init__.py": "from .stock import reorder\n", "inventory/stock.py": "def reorder(levels):\n    return sorted(k for k, v in levels.items() if v < 3)\n" },
        mainName: "main.py",
      },
      60_000
    );
    expect(pkg.passed).toBe(true);

    const data = await pool.run({ kind: "run", code: "print(open('orders.csv').read().count(','))", files: { "orders.csv": "a,1\nb,2\n" } }, 60_000);
    expect(data.stdout?.trim()).toBe("2");

    const after = await pool.run({ kind: "run", code: "import os, sys\nprint(os.path.exists('orders.csv'), 'inventory' in sys.modules)" }, 60_000);
    expect(after.stdout?.trim()).toBe("False False");
  });
});

describe("server grading on real drills", () => {
  let drills: Map<string, ContentExercise>;
  beforeAll(() => {
    drills = new Map(loadContent().tracks.flatMap((t) => t.modules.flatMap((m) => [...m.exercises.values()])).map((e) => [e.slug, e]));
  });

  const toGrade = (e: ContentExercise) => ({
    type: e.type,
    starterCode: e.starter,
    tests: e.tests,
    testCases: "[]",
    packages: e.packages,
    timeoutMs: e.timeout * 1000,
    importSolution: e.importSolution,
    mainFile: e.mainFile,
  });
  const files = (e: ContentExercise, which: "starter" | "solution") =>
    e.extraFiles.length ? Object.fromEntries(e.extraFiles.map((f) => [f.path, f[which]])) : undefined;

  it("passes a solution and fails its starter", async () => {
    const e = drills.get("numbers-make-change")!;
    expect(await gradeOnServer(toGrade(e), e.solution)).toMatchObject({ graded: true, passed: true });
    expect(await gradeOnServer(toGrade(e), e.starter)).toMatchObject({ graded: true, passed: false });
  });

  it("fails a runaway loop instead of hanging", async () => {
    const e = drills.get("numbers-make-change")!;
    expect(await gradeOnServer(toGrade(e), "def make_change(cents):\n    while True:\n        pass\n")).toMatchObject({ graded: true, passed: false });
  });

  it("grades predict drills by the real output", async () => {
    const e = drills.get("predict-print-arguments")!;
    expect(await gradeOnServer(toGrade(e), "Total:12\nA > B > C!\ndone\n")).toMatchObject({ passed: true });
    expect(await gradeOnServer(toGrade(e), "something else")).toMatchObject({ passed: false });
  });

  it("grades multi-file drills with the learner's files", async () => {
    const e = drills.get("imports-split-pricing")!;
    expect(await gradeOnServer(toGrade(e), e.solution, files(e, "solution"))).toMatchObject({ passed: true });
    expect(await gradeOnServer(toGrade(e), e.solution, files(e, "starter"))).toMatchObject({ passed: false });
  });

  // The learner's cart.py tab is served from memory; pytest must still import each planted copy
  it("grades multi-file pytest drills against planted bugs", async () => {
    const e = drills.get("pytest-shared-conftest")!;
    expect(await gradeOnServer(toGrade(e), e.solution, files(e, "solution"))).toMatchObject({ passed: true });
    expect(await gradeOnServer(toGrade(e), e.starter, files(e, "starter"))).toMatchObject({ passed: false });
    const lenient = e.solution.replace(/\n\ndef test_members_get_the_discount[\s\S]*$/, "\n");
    expect(await gradeOnServer(toGrade(e), lenient, files(e, "solution"))).toMatchObject({ passed: false });
  }, 120_000);
});
