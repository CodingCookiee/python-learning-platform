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

/**
 * Record a lesson as complete and award what finishing it earns: its XP, achievements, the day's
 * streak and any milestone. Completing twice changes nothing and earns nothing. The caller checks
 * the lesson rules first (getLessonForUser's canComplete): the "Mark lesson complete" route for
 * lessons without required drills, and the drill submit route when the last required drill passes.
 */
export async function completeLesson(userId: string, lessonId: string): Promise<LessonCompletion> {
  const existing = await prisma.progress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { completed: true },
  });
  if (existing?.completed) return { firstCompletion: false, xpGained: 0, achievements: [], milestone: null };

  await prisma.progress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { completed: true, completedAt: new Date() },
    create: { userId, lessonId, completed: true, completedAt: new Date() },
  });
  await prisma.user.update({ where: { id: userId }, data: { xp: { increment: LESSON_XP } } });
  await updateUserLevel(userId);
  await invalidateUserCache(userId);

  const achievements = await checkAndUnlockAchievements(userId, { type: "lesson_complete", lessonId });
  await updateStreak(userId);
  // XP achievements after all the XP is in
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
  if (user) achievements.push(...(await checkAndUnlockAchievements(userId, { type: "xp_update", totalXp: user.xp })));
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
export async function completeLessonAfterPass(userId: string, lessonId: string): Promise<LessonFinishedByPass | null> {
  const lesson = await getLessonForUser(lessonId, userId);
  if (!lesson || lesson.completed || !lesson.canComplete || !lesson.drills.some((d) => d.required)) return null;
  const done = await completeLesson(userId, lesson.id);
  if (!done.firstCompletion) return null;
  return {
    ...done,
    next: lesson.next ? { id: lesson.next.id, title: lesson.next.title } : null,
    moduleId: lesson.module.id,
    onRamp: await onRampHandOver(lesson.module.id),
  };
}
