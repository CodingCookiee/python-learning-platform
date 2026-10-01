import { describe, expect, it } from "vitest";
import { formatCheckIn } from "@/lib/learning-log-format";

const base = {
  phase: "Python module 5 - Object-oriented Python",
  week: 3,
  hours: 7.5,
  built: "Lessons: Classes, Properties\n2 drills passed",
  learned: "Properties validate on assignment",
  stuck: "",
  nextGoal: "Pass the OOP checkpoint",
  question: "",
};

describe("the weekly check-in (roadmap section 07)", () => {
  it("follows the template line by line", () => {
    expect(formatCheckIn(base).split("\n")).toEqual([
      "ROADMAP CHECK-IN",
      "Phase: Python module 5 - Object-oriented Python        Week: 3",
      "Hours this week: 7.5",
      "Built/finished: Lessons: Classes, Properties; 2 drills passed",
      "Learned: Properties validate on assignment",
      'Stuck on: nothing',
      "Next week's goal: Pass the OOP checkpoint",
    ]);
  });

  it("adds the question only when there is one", () => {
    expect(formatCheckIn({ ...base, question: "Why is super() needed?" })).toMatch(/\nQuestion for Claude: Why is super\(\) needed\?$/);
  });

  it("fills the gaps rather than leaving fields blank", () => {
    const text = formatCheckIn({ ...base, built: " ", learned: "", nextGoal: "" });
    expect(text).toContain("Built/finished: nothing finished yet");
    expect(text).toContain("Learned: -");
    expect(text).toContain("Next week's goal: -");
  });
});
