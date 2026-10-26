import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordDrillAttempt } from "@/lib/drill-attempt";
import { completeLesson, LESSON_XP } from "@/lib/lesson-complete";
import { recordStep, startQuest } from "@/lib/quest";
import { updateStreak, updateUserLevel } from "@/lib/achievements";
import { getUsageSummary } from "@/lib/ai/credentials";
import { dateFromKey, dayKey } from "@/lib/day";
import { makeLearner } from "./helpers";

async function withLearner(data: Record<string, unknown>, fn: (userId: string) => Promise<void>) {
  const learner = await makeLearner("race", data);
  try {
    await fn(learner.user.id);
  } finally {
    await learner.cleanup();
  }
}

describe("two requests at once earn things only once", () => {
  it("counts one first pass of a drill, though two tabs pass it together", async () => {
    await withLearner({}, async (userId) => {
      const drill = await prisma.exercise.findFirstOrThrow({ where: { archivedAt: null }, select: { id: true } });
      const attempt = () =>
        recordDrillAttempt({ userId, exerciseId: drill.id, code: "", passed: true, testResults: "[]", mode: "practice" });
      const results = await Promise.all([attempt(), attempt(), attempt()]);
      expect(results.filter((r) => r.firstPass)).toHaveLength(1);
      expect(await prisma.exerciseSubmission.count({ where: { userId, exerciseId: drill.id } })).toBe(3);
      // A later pass isn't first either
      expect((await attempt()).firstPass).toBe(false);
    });
  });

  it("doesn't count a failed attempt as a first pass", async () => {
    await withLearner({}, async (userId) => {
      const drill = await prisma.exercise.findFirstOrThrow({ where: { archivedAt: null }, select: { id: true } });
      const failed = await recordDrillAttempt({ userId, exerciseId: drill.id, code: "", passed: false, testResults: "[]" });
      expect(failed.firstPass).toBe(false);
      const passed = await recordDrillAttempt({ userId, exerciseId: drill.id, code: "", passed: true, testResults: "[]" });
      expect(passed.firstPass).toBe(true);
    });
  });

  it("gives a lesson's XP once, though it's completed twice at the same moment", async () => {
    await withLearner({}, async (userId) => {
      const lesson = await prisma.lesson.findFirstOrThrow({ where: { archivedAt: null }, select: { id: true } });
      const before = (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp;
      const results = await Promise.all([
        completeLesson(userId, lesson.id, { checkAchievements: false }),
        completeLesson(userId, lesson.id, { checkAchievements: false }),
      ]);
      expect(results.filter((r) => r.firstCompletion)).toHaveLength(1);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp).toBe(before + LESSON_XP);
    });
  });

  it("completes a lesson whose progress row was already open, once", async () => {
    await withLearner({}, async (userId) => {
      const lesson = await prisma.lesson.findFirstOrThrow({ where: { archivedAt: null }, select: { id: true } });
      await prisma.progress.create({ data: { userId, lessonId: lesson.id, completed: false } });
      const results = await Promise.all([
        completeLesson(userId, lesson.id, { checkAchievements: false }),
        completeLesson(userId, lesson.id, { checkAchievements: false }),
      ]);
      expect(results.filter((r) => r.firstCompletion)).toHaveLength(1);
    });
  });

  it("finishes the quest when its last two steps land together", async () => {
    await withLearner({ onboardedAt: new Date() }, async (userId) => {
      await startQuest(userId);
      for (const step of ["run-code", "scratchpad", "first-drill"] as const) await recordStep(userId, step);
      const [a, b] = await Promise.all([recordStep(userId, "fix-bug"), recordStep(userId, "progress")]);
      const row = await prisma.questProgress.findFirstOrThrow({ where: { userId } });
      expect(row.finishedAt).not.toBeNull();
      // Ready to Train, awarded by exactly one of them
      const awarded = [...a.achievements, ...b.achievements].filter((x) => x.slug === "ready-to-train");
      expect(awarded).toHaveLength(1);
    });
  });

  it("keeps the level in step with XP added by two requests at once", async () => {
    await withLearner({ xp: 490 }, async (userId) => {
      const add = async () => {
        await prisma.user.update({ where: { id: userId }, data: { xp: { increment: 10 } } });
        await updateUserLevel(userId);
      };
      await Promise.all([add(), add()]);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true, level: true } });
      expect(user).toEqual({ xp: 510, level: 2 });
    });
  });
});

describe("the learner's own days", () => {
  // Wherever "now" falls, a zone 14 hours ahead and one 11 hours behind are on different dates for
  // part of every UTC day; these zones make the streak's day the learner's, whichever it is
  const zones = ["Pacific/Kiritimati", "Pacific/Pago_Pago"];

  it("counts the streak by the learner's date, stored as that date", async () => {
    for (const timeZone of zones) {
      await withLearner({ timeZone }, async (userId) => {
        const today = dayKey(new Date(), timeZone);
        const yesterday = dateFromKey(today);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        await prisma.streak.create({ data: { userId, currentStreak: 3, longestStreak: 3, lastActivityDate: yesterday } });
        expect(await updateStreak(userId, { checkAchievements: false })).toBe(4);
        const streak = await prisma.streak.findUniqueOrThrow({ where: { userId } });
        expect(streak.lastActivityDate.toISOString().slice(0, 10)).toBe(today);
        // The same day again changes nothing
        expect(await updateStreak(userId, { checkAchievements: false })).toBe(4);
      });
    }
  });

  it("counts today's AI calls from the learner's midnight", async () => {
    await withLearner({ timeZone: "Pacific/Kiritimati" }, async (userId) => {
      const midnight = new Date(`${dayKey(new Date(), "Pacific/Kiritimati")}T00:00:00+14:00`);
      await prisma.llmUsage.createMany({
        data: [
          // Just before the learner's midnight: yesterday for them
          { userId, feature: "tutor", provider: "anthropic", model: "m", createdAt: new Date(midnight.getTime() - 60_000) },
          { userId, feature: "tutor", provider: "anthropic", model: "m", createdAt: new Date(midnight.getTime() + 60_000) },
        ],
      });
      expect((await getUsageSummary(userId)).today.calls).toBe(1);
    });
  });
});
