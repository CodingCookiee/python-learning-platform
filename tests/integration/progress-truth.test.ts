import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { updateStreak } from "@/lib/achievements";
import { completeLessonAfterPass, LESSON_XP } from "@/lib/lesson-complete";
import { makeLearner } from "./helpers";

let learner: Awaited<ReturnType<typeof makeLearner>>;
beforeAll(async () => {
  learner = await makeLearner("truth");
});
afterAll(() => learner.cleanup());

describe("the streak", () => {
  it("counts the first day of practice, though sign-up dated the streak today", async () => {
    // As sign-up creates it: zero, dated now
    await prisma.streak.create({ data: { userId: learner.user.id, currentStreak: 0, longestStreak: 0 } });
    expect(await updateStreak(learner.user.id)).toBe(1);
    // More practice the same day doesn't count twice
    expect(await updateStreak(learner.user.id)).toBe(1);
  });

  it("grows on the next day and starts over after a gap", async () => {
    const yesterday = new Date(Date.now() - 24 * 3600_000);
    await prisma.streak.update({ where: { userId: learner.user.id }, data: { lastActivityDate: yesterday } });
    expect(await updateStreak(learner.user.id)).toBe(2);
    const lastWeek = new Date(Date.now() - 7 * 24 * 3600_000);
    await prisma.streak.update({ where: { userId: learner.user.id }, data: { lastActivityDate: lastWeek } });
    expect(await updateStreak(learner.user.id)).toBe(1);
    expect((await prisma.streak.findUniqueOrThrow({ where: { userId: learner.user.id } })).longestStreak).toBe(2);
  });
});

describe("finishing a lesson by passing its drills", () => {
  it("completes the lesson, with its XP, when the last required drill passes, and only once", async () => {
    // The first Python module's first lesson that has required drills (earlier lessons done first)
    const lesson = await prisma.lesson.findFirstOrThrow({
      where: { archivedAt: null, module: { order: 1, track: { slug: "python" } }, exercises: { some: { required: true, archivedAt: null } } },
      orderBy: { order: "asc" },
      select: { id: true, order: true, moduleId: true, exercises: { where: { required: true, archivedAt: null }, select: { id: true } } },
    });
    const earlier = await prisma.lesson.findMany({
      where: { moduleId: lesson.moduleId, archivedAt: null, order: { lt: lesson.order } },
      select: { id: true },
    });
    await prisma.progress.createMany({ data: earlier.map((l) => ({ userId: learner.user.id, lessonId: l.id, completed: true, completedAt: new Date() })) });
    const pass = (exerciseId: string) =>
      prisma.exerciseSubmission.create({ data: { userId: learner.user.id, exerciseId, code: "", passed: true, testResults: "[]" } });

    const [last, ...rest] = lesson.exercises;
    for (const e of rest) await pass(e.id);
    // Drills still to go: not finished
    expect(await completeLessonAfterPass(learner.user.id, lesson.id)).toBeNull();

    const xpBefore = (await prisma.user.findUniqueOrThrow({ where: { id: learner.user.id } })).xp;
    await pass(last!.id);
    const done = await completeLessonAfterPass(learner.user.id, lesson.id);
    expect(done).toMatchObject({ firstCompletion: true, xpGained: LESSON_XP, moduleId: lesson.moduleId });
    const progress = await prisma.progress.findUniqueOrThrow({ where: { userId_lessonId: { userId: learner.user.id, lessonId: lesson.id } } });
    expect(progress.completed).toBe(true);
    // The lesson's XP, plus whatever achievements finishing it unlocked
    const unlockedXp = done!.achievements.reduce((sum, a) => sum + a.xpReward, 0);
    const xpAfter = (await prisma.user.findUniqueOrThrow({ where: { id: learner.user.id } })).xp;
    expect(xpAfter).toBe(xpBefore + LESSON_XP + unlockedXp);

    // Passing again (or another drill in it) earns nothing more
    expect(await completeLessonAfterPass(learner.user.id, lesson.id)).toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: learner.user.id } })).xp).toBe(xpAfter);
  });
});
