import "dotenv/config";
import { prisma } from "../lib/prisma";
import { gradeOnServer } from "../lib/grading/server";

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 240)}` : ""}`);
}

async function main() {
  const t0 = Date.now();
  const pick = (where: object) =>
    prisma.exercise.findFirstOrThrow({ where: { archivedAt: null, ...where }, orderBy: { slug: "asc" } });
  const fn = await pick({ slug: "numbers-make-change" });
  const program = await pick({ type: "program" });
  const withPackages = await prisma.exercise.findFirst({ where: { archivedAt: null, packages: { has: "pydantic" } } });
  const predict = await pick({ slug: "predict-print-arguments" });

  const good = await gradeOnServer(fn, fn.solution);
  check("function drill: solution passes", good.graded && good.passed, { ...good, ms: Date.now() - t0 });
  const bad = await gradeOnServer(fn, fn.starterCode);
  check("function drill: starter fails", bad.graded && !bad.passed);
  const loop = await gradeOnServer(fn, "def make_change(cents):\n    while True:\n        pass\n");
  check("runaway loop fails, doesn't hang", loop.graded && !loop.passed, loop);
  check("program drill: solution passes", (await gradeOnServer(program, program.solution)).graded);
  if (withPackages) {
    const t1 = Date.now();
    const pkg = await gradeOnServer(withPackages, withPackages.solution);
    check(`package drill (${withPackages.slug}) passes`, pkg.graded && pkg.passed, { ms: Date.now() - t1 });
  }

  // Predict: the reference output comes from running the starter
  const right = await gradeOnServer(predict, "Total:12\nA > B > C!\ndone\n");
  check("predict: the expected output passes", right.graded && right.passed, { slug: predict.slug });
  const wrong = await gradeOnServer(predict, "definitely not the output");
  check("predict: a wrong answer fails", wrong.graded && !wrong.passed);
  console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`, `${Date.now() - t0} ms`);
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
