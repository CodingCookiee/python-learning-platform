import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  FIRST_SESSION,
  getQuest,
  questCard,
  questEvent,
  recordDrillPass,
  recordStep,
  resumeQuest,
  skipQuest,
  startQuest,
} from "@/lib/quest";
import { saveOnboarding } from "@/lib/onboarding";
import { makeLearner } from "./helpers";

async function withLearner(data: Record<string, unknown>, fn: (userId: string) => Promise<void>) {
  const learner = await makeLearner("quest", { onboardedAt: new Date(), ...data });
  try {
    await fn(learner.user.id);
  } finally {
    await learner.cleanup();
  }
}

describe("the first-session quest", () => {
  it("starts once, and links to each path's own first lesson", async () => {
    await withLearner({ experience: "new" }, async (userId) => {
      expect(await getQuest(userId)).toBeNull();
      await startQuest(userId);
      await startQuest(userId);
      expect(await prisma.questProgress.count({ where: { userId } })).toBe(1);
      const quest = (await getQuest(userId))!;
      expect(quest).toMatchObject({ active: true, finished: false, path: "beginner", current: "run-code" });
      const lesson = await prisma.lesson.findFirstOrThrow({ where: { slug: "start-what-a-program-is" }, select: { id: true } });
      expect(quest.steps[0]!.href).toBe(`/lessons/${lesson.id}`);
    });
    await withLearner({ experience: "python" }, async (userId) => {
      await startQuest(userId);
      const lesson = await prisma.lesson.findFirstOrThrow({ where: { slug: "running-python" }, select: { id: true } });
      expect((await getQuest(userId))!.steps[0]!.href).toBe(`/lessons/${lesson.id}`);
    });
  });

  it("records each step once, and finishing awards Ready to Train exactly once", async () => {
    await withLearner({}, async (userId) => {
      await startQuest(userId);
      await recordStep(userId, "run-code");
      await recordStep(userId, "run-code");
      expect((await getQuest(userId))!.completed).toEqual(["run-code"]);
      for (const step of ["scratchpad", "first-drill", "fix-bug"] as const) await recordStep(userId, step);
      const last = await recordStep(userId, "progress");
      expect(last.view).toMatchObject({ finished: true, active: false, current: null });
      expect(last.achievements.map((a) => a.slug)).toContain("ready-to-train");
      const again = await recordStep(userId, "progress");
      expect(again.achievements).toEqual([]);
      expect(again.view!.rewardXp).toBe(50);
      expect(questCard(again.view)).toBeNull();
    });
  });

  it("ticks drill steps from real drill passes", async () => {
    await withLearner({}, async (userId) => {
      await startQuest(userId);
      await recordDrillPass(userId, { slug: "hello-pylearn", type: "program" });
      expect((await getQuest(userId))!.completed).toEqual(["first-drill"]);
      await recordDrillPass(userId, { slug: "fix-the-indentation", type: "program" });
      expect((await getQuest(userId))!.completed).toEqual(["first-drill", "fix-bug"]);
    });
  });

  it("ignores everything while skipped, and keeps steps on resume", async () => {
    await withLearner({}, async (userId) => {
      await startQuest(userId);
      await recordStep(userId, "run-code");
      await skipQuest(userId);
      await recordStep(userId, "scratchpad");
      expect(await getQuest(userId)).toMatchObject({ skipped: true, active: false, completed: ["run-code"] });
      expect(questCard(await getQuest(userId))).toBe("resume");
      await resumeQuest(userId);
      expect(await getQuest(userId)).toMatchObject({ skipped: false, active: true, completed: ["run-code"] });
      expect(questCard(await getQuest(userId))).toBeNull();
    });
  });

  it("seeds an existing learner's drill steps from their history", async () => {
    await withLearner({}, async (userId) => {
      const [anyDrill, fixDrill] = await Promise.all([
        prisma.exercise.findFirstOrThrow({ where: { slug: "hello-pylearn" }, select: { id: true } }),
        prisma.exercise.findFirstOrThrow({ where: { type: "fix", archivedAt: null }, select: { id: true } }),
      ]);
      await prisma.exerciseSubmission.createMany({
        data: [anyDrill, fixDrill].map((d) => ({ userId, exerciseId: d.id, code: "", passed: true, testResults: "[]" })),
      });
      await startQuest(userId);
      expect((await getQuest(userId))!.completed).toEqual(["first-drill", "fix-bug"]);
    });
  });

  it("'No thanks' records a skip with no steps", async () => {
    await withLearner({}, async (userId) => {
      expect(questCard(await getQuest(userId))).toBe("offer");
      await skipQuest(userId);
      expect(questCard(await getQuest(userId))).toBeNull();
      const row = await prisma.questProgress.findUniqueOrThrow({ where: { userId_quest: { userId, quest: FIRST_SESSION } } });
      expect(row).toMatchObject({ completed: [] });
      expect(row.skippedAt).toBeInstanceOf(Date);
    });
  });
});

describe("quest events and starting", () => {
  it("first-time onboarding starts the quest, and a later plan change doesn't restart it", async () => {
    const learner = await makeLearner("quest-onboard", { onboardedAt: null });
    try {
      const answers = { experience: "new", goal: "python", weeklyHours: 5 };
      await saveOnboarding(learner.user.id, answers);
      expect(await getQuest(learner.user.id)).toMatchObject({ active: true, completed: [] });
      await recordStep(learner.user.id, "run-code");
      await saveOnboarding(learner.user.id, { ...answers, weeklyHours: 8 });
      expect((await getQuest(learner.user.id))!.completed).toEqual(["run-code"]);
    } finally {
      await learner.cleanup();
    }
  });

  it("accept only the browser's three steps, and only while the quest is active", async () => {
    await withLearner({}, async (userId) => {
      expect(await questEvent(userId, { step: "run-code" })).toMatchObject({ ok: false, status: 409 });
      await startQuest(userId);
      expect(await questEvent(userId, { step: "first-drill" })).toMatchObject({ ok: false, status: 400 });
      expect(await questEvent(userId, { step: "teleport" })).toMatchObject({ ok: false, status: 400 });
      expect(await questEvent(userId, { step: "run-code" })).toMatchObject({ ok: true });
      await skipQuest(userId);
      expect(await questEvent(userId, { step: "scratchpad" })).toMatchObject({ ok: false, status: 409 });
    });
  });
});
