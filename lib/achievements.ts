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

  const thresholds: Array<[number, string]> = [
    [1, "First Steps"],
    [5, "Quick Learner"],
    [25, "Dedicated Student"],
  ];
  for (const [n, name] of thresholds) {
    if (completedCount >= n) {
      const a = await unlockAchievement(userId, name);
      if (a) unlocked.push(a);
    }
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
      const moduleAchievements: Record<number, string> = {
        1: "Module 1 Complete",
        2: "Module 2 Complete",
        3: "Module 3 Complete",
      };
      const name = moduleAchievements[lesson.module.order];
      if (name) {
        const a = await unlockAchievement(userId, name);
        if (a) unlocked.push(a);
      }
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

  const projectAchievements: Record<number, string> = {
    1: "Calculator Pro",
    2: "Task Master",
    3: "Text Wizard",
  };
  const name = projectAchievements[moduleOrder];
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
    [7, "Week Warrior"],
    [30, "Consistent Coder"],
    [100, "Python Devotee"],
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
