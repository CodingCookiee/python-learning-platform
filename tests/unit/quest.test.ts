import { describe, expect, it } from "vitest";
import { BROWSER_STEPS, currentStep, firstLessonSlug, isBugDrill, questPath, SENSEI, STEPS } from "@/lib/quest";
import { met, type LearnerStats } from "@/lib/achievements";
import { achievementCriteriaSchema } from "@/lib/content/schema";

describe("the first-session quest", () => {
  it("has five steps, three of them reported by the browser", () => {
    expect(STEPS.map((s) => s.key)).toEqual(["run-code", "scratchpad", "first-drill", "fix-bug", "progress"]);
    expect(BROWSER_STEPS).toEqual(["run-code", "scratchpad", "progress"]);
    for (const step of STEPS) expect(step.line.length).toBeGreaterThan(10);
  });

  it("keeps every sensei line to one or two sentences", () => {
    const lines = [
      ...STEPS.map((s) => s.line),
      ...SENSEI.tour.map((t) => t.line),
      SENSEI.welcome,
      SENSEI.skip.line,
      SENSEI.offer.line,
      SENSEI.resume.line(2),
      SENSEI.farewell.line,
    ];
    for (const line of lines) {
      const sentences = line.split(/(?<=[.!?])\s+/).filter(Boolean);
      expect(sentences.length, line).toBeGreaterThanOrEqual(1);
      expect(sentences.length, line).toBeLessThanOrEqual(2);
    }
  });

  it("points at the first step not done, whatever order they were done in", () => {
    expect(currentStep([])?.key).toBe("run-code");
    expect(currentStep(["first-drill", "run-code"])?.key).toBe("scratchpad");
    expect(currentStep(["run-code", "scratchpad", "first-drill", "fix-bug"])?.key).toBe("progress");
    expect(currentStep(STEPS.map((s) => s.key))).toBeNull();
  });

  it("counts any fix drill as fixing a bug, and each path's own bug drill", () => {
    expect(isBugDrill({ slug: "start-fix-the-capital-letter", type: "fix" })).toBe(true);
    expect(isBugDrill({ slug: "fix-the-indentation", type: "program" })).toBe(true);
    expect(isBugDrill({ slug: "hello-pylearn", type: "program" })).toBe(false);
  });

  it("starts beginners in the on-ramp and everyone else in module 1", () => {
    expect(questPath("new")).toBe("beginner");
    expect(questPath("python")).toBe("developer");
    expect(questPath(null)).toBe("developer");
    expect(firstLessonSlug("beginner")).toBe("start-what-a-program-is");
    expect(firstLessonSlug("developer")).toBe("running-python");
  });
});

describe("the quest achievement criterion", () => {
  const stats = (questsFinished: string[]): LearnerStats => ({
    lessons: 0,
    drills: 0,
    passedModules: new Set(),
    capstoneModules: new Set(),
    streak: 0,
    xp: 0,
    blackBelt: false,
    lessonsByModule: new Map(),
    passedByType: new Map(),
    questsFinished: new Set(questsFinished),
  });

  it("is a valid criterion, met only once that quest is finished", () => {
    const criteria = { kind: "quest" as const, quest: "first-session" };
    expect(achievementCriteriaSchema.safeParse(criteria).success).toBe(true);
    expect(met(criteria, stats([]))).toBe(false);
    expect(met(criteria, stats(["first-session"]))).toBe(true);
  });
});
