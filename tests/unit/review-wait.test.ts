import { describe, expect, it } from "vitest";
import { describeWait, median } from "@/lib/review-wait";

const HOUR = 3_600_000;

describe("the capstone review wait", () => {
  it("takes the middle of the recent waits", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("says it the way a person would", () => {
    expect(describeWait(40 * 60_000)).toBe("about an hour");
    expect(describeWait(6.4 * HOUR)).toBe("about 6 hours");
    expect(describeWait(22 * HOUR)).toBe("about a day");
    expect(describeWait(60 * HOUR)).toBe("about 3 days");
  });
});
