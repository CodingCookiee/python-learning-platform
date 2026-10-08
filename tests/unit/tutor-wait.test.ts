import { describe, expect, it } from "vitest";
import { lineAt, SLOW_AFTER_MS, SLOW_LINE, STEP_MS, STILL_AFTER_MS, STILL_LINE, waitLines } from "@/lib/tutor/wait-lines";

const CODE = "def total(prices):\n    s = 0\n    for p in prices:\n        s += p\n    return s\n\n";

describe("the tutor's waiting lines", () => {
  it("follow a question through the learner's own code and last run", () => {
    expect(waitLines({ kind: "chat", code: CODE, result: "2 of 3 tests passed.\nFAILED handles an empty list" })).toEqual([
      "Reading your 5 lines of code…",
      "Looking at your last run: 2 of 3 tests passed…",
      "Working out where to point you…",
      "Writing a nudge, not the answer…",
    ]);
  });

  it("say what they can when there's no code or no run yet", () => {
    expect(waitLines({ kind: "chat", code: "  \n" })).toEqual([
      "Reading your question…",
      "Working out where to point you…",
      "Writing a nudge, not the answer…",
    ]);
    expect(waitLines({ kind: "chat", code: "print(1)", result: "The test run timed out." })[1]).toBe(
      "Looking at why your last run timed out…"
    );
    expect(waitLines({ kind: "chat", code: "print(1)", result: "The tests couldn't run: SyntaxError" })[1]).toBe(
      "Looking at why the tests couldn't run…"
    );
    expect(waitLines({ kind: "chat", code: "print(1)", result: "Output of my last Run:\n1" })[0]).toBe("Reading your 1 line of code…");
  });

  it("start an explanation from the error's last line, shortened", () => {
    const error = 'Traceback (most recent call last):\n  File "solution.py", line 3\nNameError: name \'totl\' is not defined';
    expect(waitLines({ kind: "explain", code: CODE, error })).toEqual([
      "Reading the error: NameError: name 'totl' is not defined…",
      "Reading your 5 lines of code…",
      "Tracing where it goes wrong…",
      "Putting it in plain words…",
    ]);
    const long = `ValueError: ${"x".repeat(200)}`;
    expect(waitLines({ kind: "explain", code: "", error: long })[0].length).toBeLessThanOrEqual(90);
  });

  it("move through the lines, then say it's still working, then that some models are slow", () => {
    const lines = ["a", "b", "c"];
    expect(lineAt(lines, 0)).toBe("a");
    expect(lineAt(lines, STEP_MS)).toBe("b");
    // Holds on the last line until the patience lines take over
    expect(lineAt(lines, STEP_MS * 3)).toBe("c");
    expect(lineAt(lines, STILL_AFTER_MS - 1)).toBe("c");
    expect(lineAt(lines, STILL_AFTER_MS)).toBe(STILL_LINE);
    expect(lineAt(lines, SLOW_AFTER_MS)).toBe(SLOW_LINE);
  });
});
