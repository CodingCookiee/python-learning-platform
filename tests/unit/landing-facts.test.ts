import { describe, expect, it } from "vitest";
import { paceLine } from "@/lib/landing/facts";

describe("the FAQ's pace line", () => {
  it("puts the black belt at roughly six months at 5 hours a week", () => {
    expect(paceLine(133, 5)).toBe("roughly six months at 5 hours a week");
    expect(paceLine(133, 10)).toBe("roughly three months at 10 hours a week");
  });

  it("counts short totals in weeks and long ones in years", () => {
    expect(paceLine(4, 5)).toBe("about a week at 5 hours a week");
    expect(paceLine(30, 5)).toBe("about 6 weeks at 5 hours a week");
    expect(paceLine(25, 1)).toBe("roughly six months at 1 hour a week");
    expect(paceLine(600, 5)).toBe("roughly two years at 5 hours a week");
    expect(paceLine(260, 5)).toBe("roughly a year at 5 hours a week");
  });
});
