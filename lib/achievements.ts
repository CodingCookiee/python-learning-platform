import { prisma } from "@/lib/prisma";

export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  xpReward: number;
}

export type AchievementEvent =
  | { type: "lesson_complete"; lessonId: string }
  | { type: "exercise_pass"; exerciseId: string }
  | { type: "project_complete"; moduleOrder: number }
  | { type: "streak_update"; streakDays: number }
  | { type: "xp_update"; totalXp: number };

const moduleAchievementNames: Record<number, string> = {
  1: "Hello, Python!",
  2: "Data Master",
  3: "Function Expert",
  4: "OOP Master",
  5: "File Handler",
  6: "Test Ninja",
  7: "Package Pro",
  8: "Async Wizard",
  9: "Python Sorcerer",
  10: "Type Guardian",
  11: "Web Developer",
  12: "Database Guru",
  13: "Data Scientist",
  14: "DevOps Hero",
  15: "Web3 Pioneer",
  16: "Performance Beast",
};

const projectAchievementNames: Record<number, string> = {
  1: "Calculator Pro",
  2: "Task Master",
  3: "Text Wizard",
  4: "Library Architect",
  5: "ETL Engineer",
  6: "Quality Assurance",
  7: "Package Publisher",
  8: "Async Master",
  9: "Framework Builder",
  10: "Type Safety Champion",
  11: "API Architect",
  12: "Multi-DB Master",
  13: "Data Analyst",
  14: "Automation King",
  15: "Blockchain Builder",
  16: "Speed Demon",
};

const phaseAchievementRules = [
  { name: "Phase 1 Complete", requiredModules: [1, 2, 3] },
  { name: "Phase 2 Complete", requiredModules: [4, 5, 6, 7] },
  { name: "Phase 3 Complete", requiredModules: [8, 9, 10] },
  { name: "Phase 4 Complete", requiredModules: [11, 12, 13, 14, 15, 16] },
  {
    name: "Python Master",
    requiredModules: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  },
] as const;

// ─── Core helpers ────────────────────────────────────────────────────────────

export function calculateLevel(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

export async function updateUserLevel(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true },
  });
  if (!user) return;
  const newLevel = calculateLevel(user.xp);
  await prisma.user.update({
    where: { id: userId },
    data: { level: newLevel },
  });
}

export async function unlockAchievement(
  userId: string,
  achievementName: string
): Promise<UnlockedAchievement | null> {
  const achievement = await prisma.achievement.findUnique({
    where: { name: achievementName },
  });
  if (!achievement) return null;

  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
  });
  if (existing) return null;

  await prisma.userAchievement.create({
    data: { userId, achievementId: achievement.id },
  });

  if (achievement.xpReward > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: achievement.xpReward } },
    });
  }

  return {
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    tier: achievement.tier,
    xpReward: achievement.xpReward,
  };
}

// ─── Streak management ───────────────────────────────────────────────────────

export async function updateStreak(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let streak = await prisma.streak.findUnique({ where: { userId } });

  if (!streak) {
    streak = await prisma.streak.create({
      data: { userId, currentStreak: 1, longestStreak: 1, lastActivityDate: today },
    });
    await checkAndUnlockAchievements(userId, { type: "streak_update", streakDays: 1 });
    return 1;
  }

  const last = new Date(streak.lastActivityDate);
  last.setHours(0, 0, 0, 0);

  if (last.getTime() === today.getTime()) {
    return streak.currentStreak; // already recorded today
  }

  let newStreak: number;
  if (last.getTime() === yesterday.getTime()) {
    newStreak = streak.currentStreak + 1;
  } else {
    newStreak = 1; // reset
  }

  const newLongest = Math.max(newStreak, streak.longestStreak);

  await prisma.streak.update({
    where: { userId },
    data: { currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: today },
  });

  await checkAndUnlockAchievements(userId, { type: "streak_update", streakDays: newStreak });
  return newStreak;
}

// ─── Achievement criteria ────────────────────────────────────────────────────

async function checkLessonAchievements(
  userId: string,
  lessonId: string
): Promise<UnlockedAchievement[]> {
  const unlocked: UnlockedAchievement[] = [];

  const completedCount = await prisma.progress.count({
    where: { userId, completed: true },
  });

  if (completedCount >= 1) {
    const firstSteps = await unlockAchievement(userId, "First Steps");
    if (firstSteps) unlocked.push(firstSteps);
  }

  // Module completion achievements
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { id: true, order: true } } },
  });
  if (lesson) {
    const allModuleLessons = await prisma.lesson.findMany({
      where: { moduleId: lesson.moduleId },
      select: { id: true },
    });
    const completedInModule = await prisma.progress.count({
      where: {
        userId,
        lessonId: { in: allModuleLessons.map((l) => l.id) },
        completed: true,
      },
    });
    if (completedInModule >= allModuleLessons.length) {
      const name = moduleAchievementNames[lesson.module.order];
      if (name) {
        const a = await unlockAchievement(userId, name);
        if (a) unlocked.push(a);
      }
    }
  }

  const completedModuleOrders = await getCompletedModuleOrders(userId);
  const completedModuleSet = new Set(completedModuleOrders);
  for (const rule of phaseAchievementRules) {
    if (rule.requiredModules.every((moduleOrder) => completedModuleSet.has(moduleOrder))) {
      const achievement = await unlockAchievement(userId, rule.name);
      if (achievement) unlocked.push(achievement);
    }
  }

  return unlocked;
}

async function checkExerciseAchievements(userId: string): Promise<UnlockedAchievement[]> {
  const unlocked: UnlockedAchievement[] = [];

  const completedCount = await prisma.exerciseSubmission.findMany({
    where: { userId, passed: true },
    distinct: ["exerciseId"],
    select: { exerciseId: true },
  });
  const count = completedCount.length;

  const thresholds: Array<[number, string]> = [
    [10, "Problem Solver"],
    [25, "Coding Machine"],
    [50, "Exercise Champion"],
  ];
  for (const [n, name] of thresholds) {
    if (count >= n) {
      const a = await unlockAchievement(userId, name);
      if (a) unlocked.push(a);
    }
  }

  return unlocked;
}

async function checkProjectAchievements(
  userId: string,
  moduleOrder: number
): Promise<UnlockedAchievement[]> {
  const unlocked: UnlockedAchievement[] = [];

  const name = projectAchievementNames[moduleOrder];
  if (name) {
    const a = await unlockAchievement(userId, name);
    if (a) unlocked.push(a);
  }

  return unlocked;
}

async function checkStreakAchievements(
  userId: string,
  streakDays: number
): Promise<UnlockedAchievement[]> {
  const unlocked: UnlockedAchievement[] = [];

  const thresholds: Array<[number, string]> = [
    [7, "Consistent Learner"],
    [30, "Dedication Master"],
    [100, "Unstoppable"],
  ];
  for (const [n, name] of thresholds) {
    if (streakDays >= n) {
      const a = await unlockAchievement(userId, name);
      if (a) unlocked.push(a);
    }
  }

  return unlocked;
}

async function checkXpAchievements(
  userId: string,
  totalXp: number
): Promise<UnlockedAchievement[]> {
  const unlocked: UnlockedAchievement[] = [];

  const thresholds: Array<[number, string]> = [
    [500, "XP Collector"],
    [1000, "XP Hoarder"],
    [5000, "XP Legend"],
  ];
  for (const [n, name] of thresholds) {
    if (totalXp >= n) {
      const a = await unlockAchievement(userId, name);
      if (a) unlocked.push(a);
    }
  }

  return unlocked;
}

// ─── Main entry point ────────────────────────────────────────────────────────

export async function checkAndUnlockAchievements(
  userId: string,
  event: AchievementEvent
): Promise<UnlockedAchievement[]> {
  try {
    switch (event.type) {
      case "lesson_complete":
        return await checkLessonAchievements(userId, event.lessonId);
      case "exercise_pass":
        return await checkExerciseAchievements(userId);
      case "project_complete":
        return await checkProjectAchievements(userId, event.moduleOrder);
      case "streak_update":
        return await checkStreakAchievements(userId, event.streakDays);
      case "xp_update":
        return await checkXpAchievements(userId, event.totalXp);
      default:
        return [];
    }
  } catch (error) {
    console.error("Error checking achievements:", error);
    return [];
  }
}

async function getCompletedModuleOrders(userId: string): Promise<number[]> {
  const [modules, completedLessons] = await Promise.all([
    prisma.module.findMany({
      select: {
        order: true,
        lessons: {
          select: { id: true },
        },
      },
      orderBy: { order: "asc" },
    }),
    prisma.progress.findMany({
      where: { userId, completed: true },
      select: { lessonId: true },
    }),
  ]);

  const completedLessonIds = new Set(completedLessons.map((lesson) => lesson.lessonId));
  return modules
    .filter(
      (module) =>
        module.lessons.length > 0 &&
        module.lessons.every((lesson) => completedLessonIds.has(lesson.id))
    )
    .map((module) => module.order);
}

// ??? Milestone detection ?????????????????????????????????????????????????????

/**
 * Returns the milestone percentage (25 | 50 | 75 | 100) if the overall
 * completion just crossed one, otherwise null.
 * @param userId  The user whose progress to check.
 */
export async function checkMilestone(userId: string): Promise<25 | 50 | 75 | 100 | null> {
  const [totalLessons, totalProjects, completedLessons, completedProjects] = await Promise.all([
    prisma.lesson.count(),
    prisma.project.count(),
    prisma.progress.count({ where: { userId, completed: true } }),
    prisma.projectSubmission.count({ where: { userId, status: "approved" } }),
  ]);

  const total = totalLessons + totalProjects;
  if (total === 0) return null;

  const done = completedLessons + completedProjects;
  const pct = (done / total) * 100;

  // Check thresholds from highest to lowest so we return the most significant one
  if (pct >= 100) return 100;
  if (pct >= 75) return 75;
  if (pct >= 50) return 50;
  if (pct >= 25) return 25;
  return null;
}
