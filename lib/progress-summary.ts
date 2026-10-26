import { prisma } from "@/lib/prisma";
import { getCached, CacheKeys } from "@/lib/cache";
import { dayKey, startOfDay } from "@/lib/day";
import { learnerTimeZone } from "@/lib/learner-time-zone";
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
  // The calendar's days are the learner's own (the browser draws it in their zone), not the server's UTC
  const timeZone = await learnerTimeZone(userId);
  const eightyfourDaysAgo = startOfDay(new Date(Date.now() - 84 * 86_400_000), timeZone);
  // Independent reads, in parallel: on a remote database each one is a round trip
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
    // Only what the summary shows. The row also holds the uploaded files (base64, up to megabytes) and
    // the examiner's private AI draft, and this summary goes to the browser and into the cache
    prisma.projectSubmission.findMany({
      where: { userId, status: "approved", project: LIVE_PROJECT },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        evaluatedAt: true,
        project: { select: { id: true, title: true, moduleId: true, xpReward: true } },
      },
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

  // Active dates for the streak calendar (last 84 days), as the learner's calendar dates
  const activeDateSet = new Set<string>();
  for (const p of recentProgress) {
    if (p.completedAt) activeDateSet.add(dayKey(new Date(p.completedAt), timeZone));
  }
  for (const e of recentExercises) {
    activeDateSet.add(dayKey(new Date(e.submittedAt), timeZone));
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
