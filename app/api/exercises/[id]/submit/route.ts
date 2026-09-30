import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache, invalidateCache, CacheKeys } from "@/lib/cache";
import {
  checkAndUnlockAchievements,
  updateStreak,
  updateUserLevel,
  type UnlockedAchievement,
} from "@/lib/achievements";
import { SOLUTION_AFTER_ATTEMPTS } from "@/lib/drills";
import { openAttemptForDrill, recordCheckpointRun } from "@/lib/checkpoint";
import { addToReview, recordReview, type ReviewOutcome } from "@/lib/review";
import { REVIEW_XP } from "@/lib/mastery-rules";
import { z } from "zod";

const submitSchema = z.object({
  code: z.string().max(100_000),
  passed: z.boolean(),
  testResults: z.string().max(200_000),
  hintsUsed: z.number().int().min(0).default(0),
  /** What the learner was doing; a drill inside an open checkpoint is always a checkpoint run */
  mode: z.enum(["practice", "review", "checkpoint"]).default("practice"),
});

/**
 * POST /api/exercises/[id]/submit
 * Record an attempt. On a drill's first pass: XP, a place in the review deck,
 * achievements. A review attempt moves the review schedule; a checkpoint
 * attempt counts toward the open checkpoint. The reference solution only ever
 * comes back in practice.
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id: exerciseId } = await context.params;
    const { userId } = context;

    const validation = submitSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request", details: validation.error.issues }, { status: 400 });
    }
    const { code, passed, testResults, hintsUsed } = validation.data;

    const exercise = await prisma.exercise.findFirst({ where: { id: exerciseId, archivedAt: null } });
    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const attempt = await openAttemptForDrill(userId, exerciseId);
    const mode = attempt ? "checkpoint" : validation.data.mode;
    if (mode === "checkpoint" && !attempt) {
      return NextResponse.json({ error: "This checkpoint is closed." }, { status: 409 });
    }

    const [previousPractice, alreadyPassed, userBefore] = await Promise.all([
      prisma.exerciseSubmission.count({ where: { userId, exerciseId, mode: "practice" } }),
      prisma.exerciseSubmission.findFirst({ where: { userId, exerciseId, passed: true }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { level: true } }),
    ]);
    const oldLevel = userBefore?.level ?? 1;

    const submission = await prisma.exerciseSubmission.create({
      data: {
        userId,
        exerciseId,
        code,
        passed,
        testResults,
        hintsUsed: mode === "checkpoint" ? 0 : hintsUsed,
        attempts: mode === "practice" ? previousPractice + 1 : 1,
        mode,
        checkpointAttemptId: attempt?.id ?? null,
      },
    });

    let xpGained = 0;
    const achievements: UnlockedAchievement[] = [];

    // A drill's first pass, in any mode, earns its XP and joins the review deck
    const firstSolve = passed && !alreadyPassed;
    if (firstSolve) {
      xpGained += exercise.xpReward;
      await addToReview(userId, exercise);
    }

    let review: ReviewOutcome | null = null;
    if (mode === "review") {
      review = await recordReview(userId, exerciseId, { passed, hintsUsed });
      if (review.counted && passed && hintsUsed === 0) xpGained += REVIEW_XP;
    }

    let checkpoint: Awaited<ReturnType<typeof recordCheckpointRun>> | null = null;
    if (mode === "checkpoint" && attempt) {
      checkpoint = await recordCheckpointRun(userId, attempt.id, exerciseId, passed);
      if (checkpoint.ok && checkpoint.finished) achievements.push(...checkpoint.finished.achievements);
    }

    if (xpGained > 0) {
      await prisma.user.update({ where: { id: userId }, data: { xp: { increment: xpGained } } });
      await updateUserLevel(userId);
    }
    if (passed) {
      await updateStreak(userId);
      achievements.push(...(await checkAndUnlockAchievements(userId, { type: "exercise_pass", exerciseId })));
    }

    const userAfter = await prisma.user.findUnique({ where: { id: userId }, select: { level: true } });
    const newLevel = userAfter?.level ?? oldLevel;

    await invalidateCache(CacheKeys.exercise(exerciseId, userId));
    await invalidateUserCache(userId);

    const finished = checkpoint?.ok ? checkpoint.finished : null;
    return NextResponse.json({
      success: true,
      mode,
      submission: {
        id: submission.id,
        passed: submission.passed,
        attempts: mode === "practice" ? submission.attempts : previousPractice,
        hintsUsed: submission.hintsUsed,
      },
      xpGained: xpGained + (finished?.xpGained ?? 0),
      newlySolved: firstSolve,
      achievements,
      levelUp: newLevel > oldLevel,
      newLevel,
      review,
      checkpoint: checkpoint?.ok
        ? {
            passedCount: checkpoint.passedCount,
            total: checkpoint.total,
            finished: finished ? { score: finished.score, passed: finished.passed } : null,
          }
        : checkpoint
          ? { error: checkpoint.error }
          : null,
      // The reference solution unlocks on a pass, or after enough honest attempts, in practice only
      solution:
        mode === "practice" && (passed || submission.attempts >= SOLUTION_AFTER_ATTEMPTS) ? exercise.solution : null,
    });
  } catch (error) {
    console.error("Error submitting exercise:", error);
    return NextResponse.json({ error: "Failed to submit exercise" }, { status: 500 });
  }
});
