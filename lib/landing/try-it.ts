/**
 * The landing page's "Try it" sandbox: run a line, fix a bug, earn a stripe
 * (docs/superpowers/specs/2026-10-08-landing-how-it-works-design.md). The code, the check and the
 * sensei's lines live here, away from React and Python, so they can be tested and reviewed.
 */

export const STEP1_CODE = 'print("Hello!")';

/** Step 2: a quote is missing, so Python stops before printing anything */
export const BROKEN_CODE = 'print("Welcome to the café!)';

export const EXPECTED = "Welcome to the café!";

/** What the sensei says at each step (one or two sentences; reviewed by the owner) */
export const TRY_IT_LINES = {
  run: "Press Run. The computer does exactly what the line says.",
  fix: "This line has a bug: a quote is missing. Read the error, fix it, run the tests.",
  stripe: "That's a stripe. Here you earn rank by passing, not by clicking next.",
  /** Step 3 when Python couldn't run, so no stripe was earned: the approved line's second half */
  stripeUnearned: "Here you earn rank by passing, not by clicking next.",
} as const;

/** The traceback's last line: the part that names the problem */
export function errorLine(error: string): string {
  return error.trim().split("\n").filter((line) => line.trim() !== "").at(-1)?.trim() ?? error;
}

export type FixResult = { passed: true } | { passed: false; reason: string };

/** The one test: the program runs and prints exactly the expected line */
export function checkFix({ output, error }: { output: string; error: string | null }): FixResult {
  if (error) return { passed: false, reason: `It stopped with an error: ${errorLine(error)}` };
  const printed = output.replace(/\r\n/g, "\n").replace(/\n$/, "");
  if (printed === EXPECTED) return { passed: true };
  if (printed === "") return { passed: false, reason: "It didn't print anything." };
  const lines = printed.split("\n").length;
  if (lines > 1) return { passed: false, reason: `It printed ${lines} lines; the test wants just the one.` };
  return { passed: false, reason: `It printed "${printed}", not "${EXPECTED}".` };
}

/**
 * Python never started (blocked or offline download, a crashed worker), as opposed to the learner's
 * code raising: the runtime reports those as a RuntimeError whose traceback is only the message.
 */
export function isStartFailure(error: { type: string; message: string; traceback: string; line: number | null }): boolean {
  return error.type === "RuntimeError" && error.line === null && error.traceback === error.message;
}
