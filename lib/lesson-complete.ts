import { prisma } from "@/lib/prisma";
import { invalidateUserCache } from "@/lib/cache";
import { getLessonForUser } from "@/lib/lessons";
import { onRampHandOver } from "@/lib/onramp";
import {
  checkAndUnlockAchievements,
  checkMilestone,
  updateStreak,
  updateUserLevel,
  type UnlockedAchievement,
} from "@/lib/achievements";

/** XP for finishing a lesson (once) */
export const LESSON_XP = 10;

export interface LessonCompletion {
  /** False when the lesson was already complete: nothing new is earned */
  firstCompletion: boolean;
  xpGained: number;
  achievements: UnlockedAchievement[];
  milestone: Awaited<ReturnType<typeof checkMilestone>> | null;
}

interface CompleteOptions {
  /**
   * False when the caller checks achievements itself once everything is recorded (the drill submit
   * route): a check evaluates every achievement from fresh stats, and it's the slow part.
   */
  checkAchievements?: boolean;
}

/**
 * Mark the lesson complete, true only for the one request that actually did it. Two at once (a
 * double click, two tabs, the button racing a drill pass) can't both earn the lesson's XP: the
 * conditional update lets one flip an open row, and the unique (user, lesson) lets one create it.
 */
async function markComplete(userId: string, lessonId: string): Promise<boolean> {
  const now = new Date();
  const { count } = await prisma.progress.updateMany({
    where: { userId, lessonId, completed: false },
    data: { completed: true, completedAt: now },
  });
  if (count === 1) return true;
  try {
    await prisma.progress.create({ data: { userId, lessonId, completed: true, completedAt: now } });
    return true;
  } catch (error) {
    // Already there: complete before, or another request just finished it
    if ((error as { code?: string }).code === "P2002") return false;
    throw error;
  }
}

/**
 * Record a lesson as complete and award what finishing it earns: its XP, achievements, the day's
 * streak and any milestone. Completing twice changes nothing and earns nothing. The caller checks
 * the lesson rules first (getLessonForUser's canComplete): the "Mark lesson complete" route for
 * lessons without required drills, and the drill submit route when the last required drill passes.
 */
export async function completeLesson(
  userId: string,
  lessonId: string,
  { checkAchievements = true }: CompleteOptions = {}
): Promise<LessonCompletion> {
  if (!(await markComplete(userId, lessonId))) return { firstCompletion: false, xpGained: 0, achievements: [], milestone: null };

  await prisma.user.update({ where: { id: userId }, data: { xp: { increment: LESSON_XP } } });
  await updateUserLevel(userId);
  await updateStreak(userId, { checkAchievements: false });
  await invalidateUserCache(userId);

  // One check once the lesson, its XP and the streak are all in: it covers lesson, XP and streak
  // achievements alike (and re-checks after its own XP)
  const achievements = checkAchievements ? await checkAndUnlockAchievements(userId, { type: "lesson_complete", lessonId }) : [];
  const milestone = await checkMilestone(userId);
  return { firstCompletion: true, xpGained: LESSON_XP, achievements, milestone };
}

/** A lesson finished by passing its last required drill, as the drill page shows it */
export interface LessonFinishedByPass extends LessonCompletion {
  next: { id: string; title: string } | null;
  moduleId: string;
  /** On-ramp lessons: where the white belt ceremony sends the learner, and the on-ramp's size */
  onRamp: { nextHref: string; lessons: number } | null;
}

/**
 * After a practice pass: complete the drill's lesson when that was its last required drill, by the
 * lesson page's rules (in order within the module, every required drill passed). Null when the lesson
 * isn't finished by this pass: drills still to go, earlier lessons open, no required drills (those
 * lessons have a button), or already complete.
 */
export async function completeLessonAfterPass(
  userId: string,
  lessonId: string,
  options: CompleteOptions = {}
): Promise<LessonFinishedByPass | null> {
  // Most passes aren't a lesson's last required drill: settle that with one small query before
  // loading the whole lesson for its ordering rule
  const [progress, required] = await Promise.all([
    prisma.progress.findUnique({ where: { userId_lessonId: { userId, lessonId } }, select: { completed: true } }),
    prisma.exercise.findMany({
      where: { lessonId, archivedAt: null, required: true },
      select: { submissions: { where: { userId, passed: true }, select: { id: true }, take: 1 } },
    }),
  ]);
  if (progress?.completed || required.length === 0 || required.some((d) => d.submissions.length === 0)) return null;

  const lesson = await getLessonForUser(lessonId, userId);
  if (!lesson || lesson.completed || !lesson.canComplete || !lesson.drills.some((d) => d.required)) return null;
  const done = await completeLesson(userId, lesson.id, options);
  if (!done.firstCompletion) return null;
  return {
    ...done,
    next: lesson.next ? { id: lesson.next.id, title: lesson.next.title } : null,
    moduleId: lesson.module.id,
    onRamp: await onRampHandOver(lesson.module.id),
  };
}
