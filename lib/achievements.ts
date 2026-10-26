import { prisma } from "@/lib/prisma";
import { getCurriculumState } from "@/lib/curriculum-state";
import { achievementCriteriaSchema, type AchievementCriteria } from "@/lib/content/schema";
import { blackBeltIfDue } from "@/lib/black-belt";
import { ciPassedProjectIds } from "@/lib/ci/passed";
import { daysBetween, dateFromKey, dayKey, storedDayKey } from "@/lib/day";
import { learnerTimeZone } from "@/lib/learner-time-zone";

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

/**
 * Set the level from the XP as it stands in the database, in one statement: a read and then a write
 * could put back a lower level when two requests add XP at once. Same rule as calculateLevel.
 */
export async function updateUserLevel(userId: string): Promise<void> {
  await prisma.$executeRaw`UPDATE "users" SET "level" = FLOOR("xp" / 500) + 1 WHERE "id" = ${userId}`;
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

/**
 * Count today's activity toward the streak. It unlocks any streak patch it earns, unless the caller
 * checks achievements itself straight after (`checkAchievements: false`): each check evaluates every
 * achievement from fresh stats, so one at the end of a request is enough.
 */
export async function updateStreak(userId: string, { checkAchievements = true } = {}): Promise<number> {
  // The learner's own day: training at 9pm in New York is still today there, though it's tomorrow in UTC
  const today = dayKey(new Date(), await learnerTimeZone(userId));

  const streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak) {
    await prisma.streak.create({ data: { userId, currentStreak: 1, longestStreak: 1, lastActivityDate: dateFromKey(today) } });
    if (checkAchievements) await checkAndUnlockAchievements(userId, { type: "streak_update", streakDays: 1 });
    return 1;
  }

  // Already counted on this day
  if (streak.currentStreak > 0 && daysBetween(storedDayKey(streak.lastActivityDate), today) <= 0) return streak.currentStreak;
  const next = nextStreak(streak, today);
  await prisma.streak.update({
    where: { userId },
    data: { currentStreak: next, longestStreak: Math.max(next, streak.longestStreak), lastActivityDate: dateFromKey(today) },
  });
  if (checkAchievements) await checkAndUnlockAchievements(userId, { type: "streak_update", streakDays: next });
  return next;
}

/**
 * The streak after training on `today` (the learner's "YYYY-MM-DD"). lastActivityDate holds the
 * learner's day as that date's UTC midnight. The day after the last one adds a day; the same day
 * changes nothing; a gap starts again at 1. A streak still at 0 hasn't counted anything yet: sign-up
 * creates it with today's date, and the first day of practice must count. A last day "after" today
 * (the learner moved west) counts as today.
 */
export function nextStreak(streak: { currentStreak: number; lastActivityDate: Date }, today: string): number {
  const gap = daysBetween(storedDayKey(streak.lastActivityDate), today);
  if (gap <= 0 && streak.currentStreak > 0) return streak.currentStreak;
  return gap === 1 ? streak.currentStreak + 1 : 1;
}

/** Whether a streak has lapsed by `today`: no training yesterday or today, in the learner's days */
export function streakLapsed(streak: { currentStreak: number; lastActivityDate: Date }, today: string): boolean {
  return streak.currentStreak > 0 && daysBetween(storedDayKey(streak.lastActivityDate), today) > 1;
}

// Evaluation

export interface LearnerStats {
  lessons: number;
  drills: number;
  /** Completed lessons per module slug */
  lessonsByModule: Map<string, number>;
  /** Completed lessons per track slug */
  lessonsByTrack: Map<string, number>;
  /** Different passed drills per drill type */
  passedByType: Map<string, number>;
  /** Guided quests finished, by name */
  questsFinished: Set<string>;
  passedModules: Set<string>;
  capstoneModules: Set<string>;
  streak: number;
  xp: number;
  blackBelt: boolean;
}

async function learnerStats(userId: string): Promise<LearnerStats> {
  const [completedLessons, drills, tracks, capstones, streak, user, quests] = await Promise.all([
    prisma.progress.findMany({
      where: { userId, completed: true, lesson: { archivedAt: null } },
      select: { lesson: { select: { module: { select: { slug: true, track: { select: { slug: true } } } } } } },
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
    prisma.questProgress.findMany({ where: { userId, finishedAt: { not: null } }, select: { quest: true } }),
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
    lessonsByTrack: tally(completedLessons.map((p) => p.lesson.module.track?.slug)),
    passedByType: tally(drills.map((d) => d.exercise.type)),
    questsFinished: new Set(quests.map((q) => q.quest)),
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

function lessonCount(criteria: { track?: string }, stats: LearnerStats): number {
  return criteria.track ? (stats.lessonsByTrack.get(criteria.track) ?? 0) : stats.lessons;
}

export function met(criteria: AchievementCriteria, stats: LearnerStats): boolean {
  switch (criteria.kind) {
    case "lessons":
      return lessonCount(criteria, stats) >= criteria.count;
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
    case "quest":
      return stats.questsFinished.has(criteria.quest);
  }
}

/**
 * How far along an achievement is: what's done of what it takes, and the unit to say it in ("3 of 5
 * lessons"). Null for the all-or-nothing ones (a capstone, a quest, the black belt), which have no
 * honest partial count.
 */
export function progress(criteria: AchievementCriteria, stats: LearnerStats): { done: number; of: number; unit: string } | null {
  // The unit agrees with the total: "0 of 1 lesson", "2 of 5 lessons"
  const of = (done: number, total: number, unit: string, one = unit.replace(/s(?=$| )/, "")) => ({
    done: Math.min(done, total),
    of: total,
    unit: total === 1 ? one : unit,
  });
  switch (criteria.kind) {
    case "lessons":
      return of(lessonCount(criteria, stats), criteria.count, criteria.track === "python" ? "Python lessons" : "lessons");
    case "drills":
      return of(stats.drills, criteria.count, "drills");
    case "modules":
      return of(criteria.modules.filter((slug) => stats.passedModules.has(slug)).length, criteria.modules.length, "modules");
    case "streak":
      return of(stats.streak, criteria.days, "days in a row", "day");
    case "xp":
      return of(stats.xp, criteria.amount, "XP", "XP");
    case "module-lessons":
      return of(stats.lessonsByModule.get(criteria.module) ?? 0, criteria.count, "lessons");
    case "drill-type":
      return of(stats.passedByType.get(criteria.type) ?? 0, criteria.count, `${criteria.type} drills`);
    case "capstone":
    case "black-belt":
    case "quest":
      return null;
  }
}

/** Which ladder an achievement is a rung of: same kind, same subject, different targets */
function ladder(criteria: AchievementCriteria): string {
  switch (criteria.kind) {
    case "lessons":
      return criteria.track ? `lessons:${criteria.track}` : "lessons";
    case "module-lessons":
      return `module-lessons:${criteria.module}`;
    case "drill-type":
      return `drill-type:${criteria.type}`;
    case "modules":
    case "capstone":
    case "quest":
      // Each is its own goal (a belt, a module, a project), not a rung
      return JSON.stringify(criteria);
    default:
      return criteria.kind;
  }
}

export interface BoardAchievement {
  id: string;
  slug: string | null;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  xpReward: number;
  unlockedAt: string | null;
  progress: { done: number; of: number; unit: string } | null;
  /** Achievements on one ladder share it ("drills", "streak", "module-lessons:start"): the nearest rung is the one to show */
  family: string;
}

/** Every live achievement in the syllabus's own order, each with whether it's earned and how close it is */
export async function getAchievementBoard(userId: string): Promise<BoardAchievement[]> {
  const [all, earned, stats] = await Promise.all([
    prisma.achievement.findMany({ where: { archivedAt: null }, orderBy: { order: "asc" } }),
    prisma.userAchievement.findMany({
      where: { userId, achievement: { archivedAt: null } },
      select: { achievementId: true, unlockedAt: true },
    }),
    learnerStats(userId),
  ]);
  const unlockedAt = new Map(earned.map((e) => [e.achievementId, e.unlockedAt.toISOString()]));
  return all.map((a) => {
    const criteria = parseCriteria(a.criteria);
    return {
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      tier: a.tier,
      xpReward: a.xpReward,
      unlockedAt: unlockedAt.get(a.id) ?? null,
      progress: criteria ? progress(criteria, stats) : null,
      // The belts are one ladder too: the next belt is the one to chase
      family: a.category === "Belts" ? "belts" : criteria ? ladder(criteria) : a.id,
    };
  });
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
    let remaining = await prisma.achievement.findMany({
      where: { archivedAt: null, users: { none: { userId } } },
      orderBy: { order: "asc" },
    });
    if (remaining.length === 0) return unlocked;
    let stats = await learnerStats(userId);
    for (let pass = 0; pass < 2 && remaining.length > 0; pass++) {
      const notYet: typeof remaining = [];
      let any = false;
      for (const a of remaining) {
        const criteria = parseCriteria(a.criteria);
        if (!criteria || !met(criteria, stats)) {
          notYet.push(a);
          continue;
        }
        const result = await unlock(userId, a);
        if (result) {
          unlocked.push(result);
          any = true;
        }
      }
      if (!any) break;
      remaining = notYet;
      // An unlock changes only the learner's XP (and level); nothing else the criteria read, so the
      // re-check takes the new XP rather than gathering every stat again
      await updateUserLevel(userId);
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
      stats = { ...stats, xp: user?.xp ?? stats.xp };
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
