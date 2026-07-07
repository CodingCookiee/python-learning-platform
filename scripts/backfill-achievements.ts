import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

type BackfillResult = {
  lessons: number;
  exercises: number;
  projects: number;
  streaks: number;
  xpRules: number;
  totalAchievements: number;
};

async function backfillUser(
  prisma: (typeof import("../lib/prisma"))["prisma"],
  checkAndUnlockAchievements: (typeof import("../lib/achievements"))["checkAndUnlockAchievements"],
  updateUserLevel: (typeof import("../lib/achievements"))["updateUserLevel"],
  userId: string
): Promise<BackfillResult> {
  let totalAchievements = 0;

  const completedLessons = await prisma.progress.findMany({
    where: { userId, completed: true },
    select: {
      lessonId: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: [{ completedAt: "asc" }, { createdAt: "asc" }],
  });

  for (const lesson of completedLessons) {
    totalAchievements += (
      await checkAndUnlockAchievements(userId, {
        type: "lesson_complete",
        lessonId: lesson.lessonId,
      })
    ).length;
  }

  const passedExercises = await prisma.exerciseSubmission.findMany({
    where: { userId, passed: true },
    distinct: ["exerciseId"],
    select: {
      exerciseId: true,
      submittedAt: true,
    },
    orderBy: [{ submittedAt: "asc" }],
  });

  for (const exercise of passedExercises) {
    totalAchievements += (
      await checkAndUnlockAchievements(userId, {
        type: "exercise_pass",
        exerciseId: exercise.exerciseId,
      })
    ).length;
  }

  const approvedProjects = await prisma.projectSubmission.findMany({
    where: { userId, status: "approved" },
    include: {
      project: {
        select: {
          module: {
            select: { order: true },
          },
        },
      },
    },
    orderBy: [{ submittedAt: "asc" }],
  });

  for (const submission of approvedProjects) {
    totalAchievements += (
      await checkAndUnlockAchievements(userId, {
        type: "project_complete",
        moduleOrder: submission.project.module.order,
      })
    ).length;
  }

  const streak = await prisma.streak.findUnique({
    where: { userId },
    select: { currentStreak: true },
  });
  const streaks = streak
    ? await checkAndUnlockAchievements(userId, {
        type: "streak_update",
        streakDays: streak.currentStreak,
      })
    : [];
  totalAchievements += streaks.length;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true },
  });
  const xpRules = user
    ? await checkAndUnlockAchievements(userId, {
        type: "xp_update",
        totalXp: user.xp,
      })
    : [];
  totalAchievements += xpRules.length;

  await updateUserLevel(userId);

  return {
    lessons: completedLessons.length,
    exercises: passedExercises.length,
    projects: approvedProjects.length,
    streaks: streaks.length,
    xpRules: xpRules.length,
    totalAchievements,
  };
}

async function main() {
  const { prisma } = await import("../lib/prisma");
  const { checkAndUnlockAchievements, updateUserLevel } = await import("../lib/achievements");

  console.log("Starting achievement backfill...");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  let processed = 0;
  let unlocked = 0;

  for (const user of users) {
    const result = await backfillUser(prisma, checkAndUnlockAchievements, updateUserLevel, user.id);
    processed += 1;
    unlocked += result.totalAchievements;

    console.log(
      [
        `User ${user.email ?? user.id}:`,
        `lessons=${result.lessons}`,
        `exercises=${result.exercises}`,
        `projects=${result.projects}`,
        `streakUnlocks=${result.streaks}`,
        `xpUnlocks=${result.xpRules}`,
        `newAchievements=${result.totalAchievements}`,
      ].join(" ")
    );
  }

  console.log(
    `Backfill complete. Processed ${processed} users, unlocked ${unlocked} achievements.`
  );
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Achievement backfill failed:", error);
  process.exitCode = 1;
  try {
    const { prisma } = await import("../lib/prisma");
    await prisma.$disconnect();
  } catch {
    // Ignore secondary cleanup failures.
  }
});
