import { describe, expect, it } from "vitest";
import {
  addDays,
  checkpointDeadline,
  checkpointScore,
  CHECKPOINT_MINUTES_PER_DRILL,
  drawCheckpoint,
  drillStrength,
  inCheckpointPool,
  nextReview,
  REVIEW_INTERVALS,
  REVIEW_MAX_STAGE,
  reviewEligible,
} from "@/lib/mastery-rules";

describe("checkpoint pool", () => {
  it("defaults to core and stretch drills that aren't predict drills", () => {
    expect(inCheckpointPool({ slug: "a", difficulty: "core", type: "function" }, [])).toBe(true);
    expect(inCheckpointPool({ slug: "a", difficulty: "stretch", type: "fix" }, [])).toBe(true);
    expect(inCheckpointPool({ slug: "a", difficulty: "warm-up", type: "function" }, [])).toBe(false);
    expect(inCheckpointPool({ slug: "a", difficulty: "core", type: "predict" }, [])).toBe(false);
  });

  it("uses an explicit pool when the module gives one", () => {
    expect(inCheckpointPool({ slug: "a", difficulty: "warm-up", type: "predict" }, ["a"])).toBe(true);
    expect(inCheckpointPool({ slug: "b", difficulty: "core", type: "function" }, ["a"])).toBe(false);
  });
});

describe("drawing a checkpoint", () => {
  const pool = ["l1", "l1", "l1", "l1", "l2", "l3"].map((lessonId, i) => ({ id: `d${i}`, lessonId }));

  it("draws the number asked for, without repeats", () => {
    const drawn = drawCheckpoint(pool, 4);
    expect(drawn).toHaveLength(4);
    expect(new Set(drawn.map((d) => d.id)).size).toBe(4);
  });

  it("spreads the draw across lessons before taking a second from any", () => {
    for (let i = 0; i < 20; i++) {
      const lessons = new Set(drawCheckpoint(pool, 3).map((d) => d.lessonId));
      expect(lessons.size).toBe(3);
    }
  });

  it("never draws more than the pool has", () => {
    expect(drawCheckpoint(pool, 50)).toHaveLength(pool.length);
  });
});

describe("checkpoint scoring and time", () => {
  it("scores passed drills over drawn drills, ignoring strays and repeats", () => {
    expect(checkpointScore(["a", "b", "c", "d"], ["a", "a", "b", "zzz"])).toBe(0.5);
    expect(checkpointScore([], ["a"])).toBe(0);
  });

  it("allows a fixed number of minutes per drill", () => {
    const start = new Date("2026-10-01T10:00:00Z");
    expect(checkpointDeadline(start, 6).getTime() - start.getTime()).toBe(6 * CHECKPOINT_MINUTES_PER_DRILL * 60_000);
  });
});

describe("spaced review", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  const days = (d: Date) => Math.round((d.getTime() - now.getTime()) / 86_400_000);

  it("a clean pass moves up a stage and waits that stage's interval", () => {
    const next = nextReview({ stage: 0, lapses: 0 }, { passed: true, hintsUsed: 0 }, now);
    expect(next.stage).toBe(1);
    expect(days(next.dueAt)).toBe(REVIEW_INTERVALS[1]);
  });

  it("a pass with hints keeps the stage and comes back tomorrow", () => {
    const next = nextReview({ stage: 3, lapses: 1 }, { passed: true, hintsUsed: 2 }, now);
    expect(next).toMatchObject({ stage: 3, lapses: 1 });
    expect(days(next.dueAt)).toBe(1);
  });

  it("a fail starts over and counts a lapse", () => {
    const next = nextReview({ stage: 4, lapses: 0 }, { passed: false, hintsUsed: 0 }, now);
    expect(next).toMatchObject({ stage: 0, lapses: 1 });
    expect(days(next.dueAt)).toBe(REVIEW_INTERVALS[0]);
  });

  it("stops at the last stage", () => {
    expect(nextReview({ stage: REVIEW_MAX_STAGE, lapses: 0 }, { passed: true, hintsUsed: 0 }, now).stage).toBe(REVIEW_MAX_STAGE);
  });

  it("reviews the same drills checkpoints draw from", () => {
    expect(reviewEligible({ difficulty: "core", type: "function" })).toBe(true);
    expect(reviewEligible({ difficulty: "warm-up", type: "function" })).toBe(false);
    expect(reviewEligible({ difficulty: "core", type: "predict" })).toBe(false);
  });

  it("adds days", () => {
    expect(days(addDays(now, 7))).toBe(7);
  });
});

describe("drill strength (the skill map and the black belt)", () => {
  it("is 0 unsolved, 0.4 solved, 1 after surviving every review stage", () => {
    expect(drillStrength(false, 5)).toBe(0);
    expect(drillStrength(true, null)).toBeCloseTo(0.4);
    expect(drillStrength(true, REVIEW_MAX_STAGE)).toBeCloseTo(1);
    expect(drillStrength(true, 99)).toBeCloseTo(1);
  });
});
