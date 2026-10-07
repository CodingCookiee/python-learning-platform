import { describe, expect, it } from "vitest";
import { achievementCriteriaSchema } from "@/lib/content/schema";
import { met, type LearnerStats } from "@/lib/achievements";

const stats = (over: Partial<LearnerStats> = {}): LearnerStats => ({
  lessons: 0,
  drills: 0,
  passedModules: new Set(),
  capstoneModules: new Set(),
  streak: 0,
  xp: 0,
  blackBelt: false,
  lessonsByModule: new Map(),
  passedByType: new Map(),
  questsFinished: new Set(),
  ...over,
});

describe("achievement criteria", () => {
  it("accept lessons done in a module and drills passed of a type", () => {
    expect(achievementCriteriaSchema.safeParse({ kind: "module-lessons", module: "programming-from-zero", count: 4 }).success).toBe(true);
    expect(achievementCriteriaSchema.safeParse({ kind: "drill-type", type: "fix", count: 1 }).success).toBe(true);
  });

  it("refuse a drill type that doesn't exist, and a count below one", () => {
    expect(achievementCriteriaSchema.safeParse({ kind: "drill-type", type: "banana", count: 1 }).success).toBe(false);
    expect(achievementCriteriaSchema.safeParse({ kind: "module-lessons", module: "programming-from-zero", count: 0 }).success).toBe(false);
  });

  it("count lessons only in the named module", () => {
    const criteria = { kind: "module-lessons" as const, module: "programming-from-zero", count: 4 };
    expect(met(criteria, stats({ lessons: 9, lessonsByModule: new Map([["python-basics", 6], ["programming-from-zero", 3]]) }))).toBe(false);
    expect(met(criteria, stats({ lessonsByModule: new Map([["programming-from-zero", 4]]) }))).toBe(true);
  });

  it("count passed drills of the named type only", () => {
    const criteria = { kind: "drill-type" as const, type: "fix" as const, count: 1 };
    expect(met(criteria, stats({ drills: 12, passedByType: new Map([["function", 12]]) }))).toBe(false);
    expect(met(criteria, stats({ passedByType: new Map([["fix", 1]]) }))).toBe(true);
  });

  it("leave the existing criteria as they were", () => {
    expect(met({ kind: "lessons", count: 1 }, stats({ lessons: 1 }))).toBe(true);
    expect(met({ kind: "modules", modules: ["python-basics"] }, stats())).toBe(false);
  });
});
