import { prisma } from "@/lib/prisma";
import { getCached, CacheKeys } from "@/lib/cache";
import type { Prisma } from "@/lib/generated/prisma/client";

/** Live content only: archived rows and pre-content legacy modules (no track) stay hidden */
const LIVE_MODULE = { archivedAt: null, trackId: { not: null } } satisfies Prisma.ModuleWhereInput;
const LIVE_LESSON = { archivedAt: null, module: LIVE_MODULE } satisfies Prisma.LessonWhereInput;
const LIVE_PROJECT = { archivedAt: null, module: LIVE_MODULE } satisfies Prisma.ProjectWhereInput;

/**
 * A learner's progress summary: XP and level, the streak and its calendar, completion, per-module
 * progress, recent activity and achievements. Cached for 30 minutes per learner (cleared by
 * invalidateUserCache). Pages call this directly; GET /api/progress returns it to the browser.
 */
export function getProgressSummary(userId: string) {
  return getCached(CacheKeys.userProgress(userId), () => loadProgressSummary(userId), 1800);
}

export type ProgressSummary = Awaited<ReturnType<typeof loadProgressSummary>>;

async function loadProgressSummary(userId: string) {
  // Independent reads, in parallel: on a remote database each one is a round trip
  const eightyfourDaysAgo = new Date();
  eightyfourDaysAgo.setDate(eightyfourDaysAgo.getDate() - 84);
  eightyfourDaysAgo.setHours(0, 0, 0, 0);
  const [
    user,
    completedLessons,
    passedExercises,
    approvedProjects,
    unlockedAchievements,
    existingStreak,
    recentProgress,
    recentExercises,
    totalLessons,
    totalProjects,
    modules,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, xp: true, level: true },
    }),
    prisma.progress.findMany({
      where: { userId, completed: true, lesson: LIVE_LESSON },
      include: { lesson: { select: { id: true, title: true, moduleId: true, order: true } } },
    }),
    prisma.exerciseSubmission.findMany({
      where: { userId, passed: true, exercise: { archivedAt: null, lesson: LIVE_LESSON } },
      distinct: ["exerciseId"],
      select: { exerciseId: true, submittedAt: true },
    }),
    prisma.projectSubmission.findMany({
      where: { userId, status: "approved", project: LIVE_PROJECT },
      include: { project: { select: { id: true, title: true, moduleId: true, xpReward: true } } },
    }),
    prisma.userAchievement.findMany({
      where: { userId, achievement: { archivedAt: null } },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
    }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.progress.findMany({
      where: { userId, completed: true, completedAt: { gte: eightyfourDaysAgo } },
      select: { completedAt: true },
    }),
    prisma.exerciseSubmission.findMany({
      where: { userId, passed: true, submittedAt: { gte: eightyfourDaysAgo } },
      select: { submittedAt: true },
    }),
    prisma.lesson.count({ where: LIVE_LESSON }),
    prisma.project.count({ where: LIVE_PROJECT }),
    prisma.module.findMany({
      where: LIVE_MODULE,
      orderBy: [{ track: { order: "asc" } }, { order: "asc" }],
      include: {
        lessons: { where: { archivedAt: null }, select: { id: true } },
        projects: { where: { archivedAt: null }, select: { id: true } },
      },
    }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  // If no streak record, create one
  const streak =
    existingStreak ??
    (await prisma.streak.create({
      data: { userId, currentStreak: 0, longestStreak: 0, lastActivityDate: new Date() },
    }));

  // Active dates for the streak calendar (last 84 days)
  function toDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const activeDateSet = new Set<string>();
  for (const p of recentProgress) {
    if (p.completedAt) activeDateSet.add(toDateStr(new Date(p.completedAt)));
  }
  for (const e of recentExercises) {
    activeDateSet.add(toDateStr(new Date(e.submittedAt)));
  }
  const activeDates = Array.from(activeDateSet).sort();

  // Overall completion
  const overallCompletion = {
    lessons: {
      completed: completedLessons.length,
      total: totalLessons,
      percentage: Math.round((completedLessons.length / totalLessons) * 100),
    },
    exercises: {
      completed: passedExercises.length,
      // We will update this when exercises are added
      total: 0,
      percentage: 0,
    },
    projects: {
      completed: approvedProjects.length,
      total: totalProjects,
      percentage: Math.round((approvedProjects.length / totalProjects) * 100),
    },
    overall: Math.round(
      ((completedLessons.length + approvedProjects.length) / (totalLessons + totalProjects)) * 100
    ),
  };

  // Module-by-module progress
  const moduleProgress = modules.map((module) => {
    const moduleLessonIds = module.lessons.map((l) => l.id);
    const completedInModule = completedLessons.filter((cl) =>
      moduleLessonIds.includes(cl.lesson.id)
    ).length;

    const moduleProjectIds = module.projects.map((p) => p.id);
    const completedProjects = approvedProjects.filter((ap) =>
      moduleProjectIds.includes(ap.project.id)
    ).length;

    const totalItems = module.lessons.length + module.projects.length;
    const completedItems = completedInModule + completedProjects;

    return {
      moduleId: module.id,
      moduleTitle: module.title,
      lessonsCompleted: completedInModule,
      lessonsTotal: module.lessons.length,
      projectsCompleted: completedProjects,
      projectsTotal: module.projects.length,
      completionPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    };
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      xp: user.xp,
      level: user.level,
    },
    streak: {
      current: streak.currentStreak,
      longest: streak.longestStreak,
      lastActivity: streak.lastActivityDate,
      activeDates,
    },
    completion: overallCompletion,
    modules: moduleProgress,
    recentActivity: {
      lessons: completedLessons.slice(-5).reverse(),
      projects: approvedProjects.slice(-3).reverse(),
    },
    achievements: {
      unlocked: unlockedAchievements.map((ua) => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        category: ua.achievement.category,
        tier: ua.achievement.tier,
        xpReward: ua.achievement.xpReward,
        unlockedAt: ua.unlockedAt,
      })),
      total: unlockedAchievements.length,
    },
  };
}
