import { prisma } from "@/lib/prisma";
import { getCurriculumState } from "@/lib/curriculum-state";
import { achievementCriteriaSchema, type AchievementCriteria } from "@/lib/content/schema";
import { blackBeltIfDue } from "@/lib/black-belt";
import { ciPassedProjectIds } from "@/lib/ci/passed";

/**
 * Achievements (patches) are defined in content/achievements.yaml and synced into
 * the DB with a JSON `criteria`. After anything that could earn one (a lesson, a
 * drill, a capstone, a streak day, XP), checkAndUnlockAchievements evaluates every
 * live achievement the learner doesn't have yet.
 */

export interface UnlockedAchievement {
  id: string;
  /** Stable name from content/achievements.yaml, e.g. "white-belt-tied" */
  slug: string | null;
  name: string;
  description: string;
  icon: string;
  tier: string;
  xpReward: number;
}

/** What just happened. Evaluation checks everything, so this is informational. */
export type AchievementEvent =
  | { type: "lesson_complete"; lessonId: string }
  | { type: "exercise_pass"; exerciseId: string }
  | { type: "project_complete"; moduleOrder: number }
  | { type: "streak_update"; streakDays: number }
  | { type: "xp_update"; totalXp: number };

// Levels

export function calculateLevel(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

export async function updateUserLevel(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
  if (!user) return;
  await prisma.user.update({ where: { id: userId }, data: { level: calculateLevel(user.xp) } });
}

// Unlocking

async function unlock(
  userId: string,
  achievement: {
    id: string;
    slug: string | null;
    name: string;
    description: string;
    icon: string;
    tier: string;
    xpReward: number;
  }
): Promise<UnlockedAchievement | null> {
  try {
    await prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } });
  } catch {
    return null; // already unlocked (unique constraint), e.g. by a concurrent request
  }
  if (achievement.xpReward > 0) {
    await prisma.user.update({ where: { id: userId }, data: { xp: { increment: achievement.xpReward } } });
  }
  const { id, slug, name, description, icon, tier, xpReward } = achievement;
  return { id, slug, name, description, icon, tier, xpReward };
}

/** Unlock one achievement by name (kept for callers that award something directly). */
export async function unlockAchievement(userId: string, achievementName: string): Promise<UnlockedAchievement | null> {
  const achievement = await prisma.achievement.findFirst({ where: { name: achievementName, archivedAt: null } });
  if (!achievement) return null;
  return unlock(userId, achievement);
}

// Streaks

export async function updateStreak(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak) {
    await prisma.streak.create({ data: { userId, currentStreak: 1, longestStreak: 1, lastActivityDate: today } });
    await checkAndUnlockAchievements(userId, { type: "streak_update", streakDays: 1 });
    return 1;
  }

  const last = new Date(streak.lastActivityDate);
  last.setHours(0, 0, 0, 0);
  if (last.getTime() === today.getTime()) return streak.currentStreak;

  const next = last.getTime() === yesterday.getTime() ? streak.currentStreak + 1 : 1;
  await prisma.streak.update({
    where: { userId },
    data: { currentStreak: next, longestStreak: Math.max(next, streak.longestStreak), lastActivityDate: today },
  });
  await checkAndUnlockAchievements(userId, { type: "streak_update", streakDays: next });
  return next;
}

// Evaluation

export interface LearnerStats {
  lessons: number;
  drills: number;
  /** Completed lessons per module slug */
  lessonsByModule: Map<string, number>;
  /** Different passed drills per drill type */
  passedByType: Map<string, number>;
  passedModules: Set<string>;
  capstoneModules: Set<string>;
  streak: number;
  xp: number;
  blackBelt: boolean;
}

async function learnerStats(userId: string): Promise<LearnerStats> {
  const [completedLessons, drills, tracks, capstones, streak, user] = await Promise.all([
    prisma.progress.findMany({
      where: { userId, completed: true, lesson: { archivedAt: null } },
      select: { lesson: { select: { module: { select: { slug: true } } } } },
    }),
    prisma.exerciseSubmission.findMany({
      where: { userId, passed: true, exercise: { archivedAt: null } },
      distinct: ["exerciseId"],
      select: { exerciseId: true, exercise: { select: { type: true } } },
    }),
    getCurriculumState(userId),
    prisma.projectSubmission.findMany({
      where: { userId, status: "approved", project: { archivedAt: null } },
      select: { project: { select: { module: { select: { slug: true } } } } },
    }),
    prisma.streak.findUnique({ where: { userId }, select: { currentStreak: true, longestStreak: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { xp: true } }),
  ]);
  const passedModules = new Set<string>();
  for (const t of tracks) for (const m of t.modules) if (m.passed && m.slug) passedModules.add(m.slug);
  const blackBelt = (await blackBeltIfDue(userId, tracks))?.met ?? false;
  // Capstones whose acceptance tests passed in GitHub Actions count like approved ones
  const ciProjects = await prisma.project.findMany({
    where: { id: { in: await ciPassedProjectIds(userId) }, archivedAt: null },
    select: { module: { select: { slug: true } } },
  });
  const tally = (keys: Array<string | null | undefined>) => {
    const counts = new Map<string, number>();
    for (const key of keys) if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  };
  return {
    lessons: completedLessons.length,
    drills: drills.length,
    lessonsByModule: tally(completedLessons.map((p) => p.lesson.module.slug)),
    passedByType: tally(drills.map((d) => d.exercise.type)),
    passedModules,
    capstoneModules: new Set(
      [...capstones.map((c) => c.project.module.slug), ...ciProjects.map((p) => p.module.slug)].filter((s): s is string => Boolean(s))
    ),
    // A streak patch is earned once the streak has ever reached that length
    streak: Math.max(streak?.currentStreak ?? 0, streak?.longestStreak ?? 0),
    xp: user?.xp ?? 0,
    blackBelt,
  };
}

export function met(criteria: AchievementCriteria, stats: LearnerStats): boolean {
  switch (criteria.kind) {
    case "lessons":
      return stats.lessons >= criteria.count;
    case "drills":
      return stats.drills >= criteria.count;
    case "modules":
      return criteria.modules.every((slug) => stats.passedModules.has(slug));
    case "capstone":
      return stats.capstoneModules.has(criteria.module);
    case "streak":
      return stats.streak >= criteria.days;
    case "xp":
      return stats.xp >= criteria.amount;
    case "black-belt":
      return stats.blackBelt;
    case "module-lessons":
      return (stats.lessonsByModule.get(criteria.module) ?? 0) >= criteria.count;
    case "drill-type":
      return (stats.passedByType.get(criteria.type) ?? 0) >= criteria.count;
  }
}

function parseCriteria(text: string): AchievementCriteria | null {
  try {
    const parsed = achievementCriteriaSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Unlock every live achievement whose criteria the learner now meets. XP from an
 * unlock can itself cross an XP threshold, so it re-checks once after unlocking.
 */
export async function checkAndUnlockAchievements(
  userId: string,
  event?: AchievementEvent
): Promise<UnlockedAchievement[]> {
  void event;
  try {
    const unlocked: UnlockedAchievement[] = [];
    for (let pass = 0; pass < 2; pass++) {
      const candidates = await prisma.achievement.findMany({
        where: { archivedAt: null, users: { none: { userId } } },
        orderBy: { order: "asc" },
      });
      if (candidates.length === 0) break;
      const stats = await learnerStats(userId);
      let any = false;
      for (const a of candidates) {
        const criteria = parseCriteria(a.criteria);
        if (!criteria || !met(criteria, stats)) continue;
        const result = await unlock(userId, a);
        if (result) {
          unlocked.push(result);
          any = true;
        }
      }
      if (!any) break;
      await updateUserLevel(userId);
    }
    return unlocked;
  } catch (error) {
    console.error("Error checking achievements:", error);
    return [];
  }
}

// Milestones

/**
 * The completion milestone (25 | 50 | 75 | 100 percent of live lessons and
 * capstones) the learner has reached, or null below 25%.
 */
export async function checkMilestone(userId: string): Promise<25 | 50 | 75 | 100 | null> {
  const [totalLessons, totalProjects, completedLessons, completedProjects] = await Promise.all([
    prisma.lesson.count({ where: { archivedAt: null, module: { archivedAt: null } } }),
    prisma.project.count({ where: { archivedAt: null, module: { archivedAt: null } } }),
    prisma.progress.count({ where: { userId, completed: true, lesson: { archivedAt: null } } }),
    prisma.projectSubmission.count({ where: { userId, status: "approved", project: { archivedAt: null } } }),
  ]);
  const total = totalLessons + totalProjects;
  if (total === 0) return null;
  const pct = ((completedLessons + completedProjects) / total) * 100;
  if (pct >= 100) return 100;
  if (pct >= 75) return 75;
  if (pct >= 50) return 50;
  if (pct >= 25) return 25;
  return null;
}
