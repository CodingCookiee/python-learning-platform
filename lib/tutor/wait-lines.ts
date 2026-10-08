/**
 * What the tutor panel says while it waits for a reply: short lines that follow what the tutor is
 * really doing with what the learner sent (their code, their last run or the error), then, on a
 * slow reply, that it's still working. Kept apart from React so the lines can be tested.
 */

export const STEP_MS = 2400;
export const STILL_AFTER_MS = 15_000;
export const SLOW_AFTER_MS = 40_000;
export const STILL_LINE = "Still working: a careful hint takes a moment.";
export const SLOW_LINE = "Some models take up to a minute.";

export interface WaitInput {
  kind: "chat" | "explain";
  code: string;
  /** The drill page's plain-text account of the latest run */
  result?: string;
  /** The error being explained */
  error?: string;
}

function codeLine(code: string): string {
  const lines = code.trimEnd().split("\n").length;
  if (code.trim() === "") return "Reading your question…";
  return `Reading your ${lines} ${lines === 1 ? "line" : "lines"} of code…`;
}

function runLine(result: string | undefined): string | null {
  if (!result?.trim()) return null;
  const tests = /(\d+) of (\d+) tests passed/.exec(result);
  if (tests) return `Looking at your last run: ${tests[1]} of ${tests[2]} tests passed…`;
  if (/timed out/.test(result)) return "Looking at why your last run timed out…";
  if (/couldn't run/.test(result)) return "Looking at why the tests couldn't run…";
  return "Looking at your last run…";
}

/** The error's last line (the part that names the problem), cut to fit one line of the panel */
function errorLine(error: string | undefined): string {
  const last = error?.trim().split("\n").filter((l) => l.trim() !== "").at(-1)?.trim();
  if (!last) return "Reading the error…";
  const short = last.length > 64 ? `${last.slice(0, 63).trimEnd()}…` : last;
  return `Reading the error: ${short.replace(/…$/, "")}…`;
}

export function waitLines({ kind, code, result, error }: WaitInput): string[] {
  if (kind === "explain") {
    return [errorLine(error), codeLine(code), "Tracing where it goes wrong…", "Putting it in plain words…"];
  }
  const run = runLine(result);
  return [codeLine(code), ...(run ? [run] : []), "Working out where to point you…", "Writing a nudge, not the answer…"];
}

/** The line to show `elapsedMs` into the wait: through the lines, holding on the last, then patience */
export function lineAt(lines: string[], elapsedMs: number): string {
  if (elapsedMs >= SLOW_AFTER_MS) return SLOW_LINE;
  if (elapsedMs >= STILL_AFTER_MS) return STILL_LINE;
  return lines[Math.min(Math.floor(elapsedMs / STEP_MS), lines.length - 1)] ?? STILL_LINE;
}
