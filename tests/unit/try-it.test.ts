import { describe, expect, it } from "vitest";
import { BROKEN_CODE, checkFix, errorLine, EXPECTED, isStartFailure, STEP1_CODE, TRY_IT_LINES } from "@/lib/landing/try-it";

const TRACEBACK = `Traceback (most recent call last):
  File "/lib/python3.13/site-packages/_pyodide/_base.py", line 597, in eval_code_async
  File "<exec>", line 1
    print("Welcome to the café!)
          ^
SyntaxError: unterminated string literal (detected at line 1)
`;

describe("the landing sandbox", () => {
  it("starts with one line to run and one line with a missing quote", () => {
    expect(STEP1_CODE).toBe('print("Hello!")');
    expect(BROKEN_CODE).toBe('print("Welcome to the café!)');
    expect(EXPECTED).toBe("Welcome to the café!");
  });

  it("passes the fix only when it runs and prints exactly the line", () => {
    expect(checkFix({ output: "Welcome to the café!\n", error: null })).toEqual({ passed: true });
    expect(checkFix({ output: "Welcome to the café!", error: null })).toEqual({ passed: true });
  });

  it("says why a fix doesn't pass", () => {
    expect(checkFix({ output: "", error: TRACEBACK })).toEqual({
      passed: false,
      reason: "It stopped with an error: SyntaxError: unterminated string literal (detected at line 1)",
    });
    expect(checkFix({ output: "Welcome to the cafe!\n", error: null })).toEqual({
      passed: false,
      reason: 'It printed "Welcome to the cafe!", not "Welcome to the café!".',
    });
    expect(checkFix({ output: "Welcome to the café!\nhi\n", error: null })).toEqual({
      passed: false,
      reason: "It printed 2 lines; the test wants just the one.",
    });
    expect(checkFix({ output: "", error: null })).toEqual({ passed: false, reason: "It didn't print anything." });
  });

  it("shows the traceback's last line, the part that names the problem", () => {
    expect(errorLine(TRACEBACK)).toBe("SyntaxError: unterminated string literal (detected at line 1)");
    expect(errorLine("NameError: name 'x' is not defined")).toBe("NameError: name 'x' is not defined");
  });

  it("tells Python failing to start apart from the learner's code failing", () => {
    // The runtime reports a failed download as a RuntimeError whose traceback is just the message
    expect(isStartFailure({ type: "RuntimeError", message: "Python failed to load", traceback: "Python failed to load", line: null })).toBe(true);
    expect(isStartFailure({ type: "SyntaxError", message: "unterminated string literal", traceback: TRACEBACK, line: 1 })).toBe(false);
    // The learner's own RuntimeError comes with a real traceback
    const own = "Traceback (most recent call last):\nRuntimeError: boom";
    expect(isStartFailure({ type: "RuntimeError", message: "boom", traceback: own, line: 1 })).toBe(false);
  });

  it("keeps each of the sensei's lines to one or two sentences", () => {
    for (const line of Object.values(TRY_IT_LINES)) {
      const sentences = line.split(/(?<=[.!?])\s+/).filter(Boolean);
      expect(sentences.length, line).toBeGreaterThanOrEqual(1);
      expect(sentences.length, line).toBeLessThanOrEqual(2);
    }
  });
});
