import { describe, expect, it } from "vitest";
import { DEFAULT_SLOW_AFTER_MS, DEFAULT_STEP_MS, DEFAULT_STILL_AFTER_MS, patience, stageIndex } from "@/lib/pending/stages";

describe("waiting stages", () => {
  it("move through a wait's phases one step at a time, then hold on the last", () => {
    expect(stageIndex(3, 0)).toBe(0);
    expect(stageIndex(3, DEFAULT_STEP_MS - 1)).toBe(0);
    expect(stageIndex(3, DEFAULT_STEP_MS)).toBe(1);
    expect(stageIndex(3, DEFAULT_STEP_MS * 9)).toBe(2);
    expect(stageIndex(1, 60_000)).toBe(0);
    expect(stageIndex(3, 1000, 500)).toBe(2);
  });

  it("add reassurance after a while, then more on a long wait", () => {
    expect(patience(0)).toBe("none");
    expect(patience(DEFAULT_STILL_AFTER_MS)).toBe("still");
    expect(patience(DEFAULT_SLOW_AFTER_MS)).toBe("slow");
    expect(patience(5000, { stillAfterMs: 4000, slowAfterMs: 20_000 })).toBe("still");
  });
});
