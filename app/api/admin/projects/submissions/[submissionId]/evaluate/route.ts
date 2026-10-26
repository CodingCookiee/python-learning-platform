import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, isAdmin, AuthContext } from "@/lib/api-auth";
import { CacheKeys, invalidateCache, invalidateUserCache } from "@/lib/cache";
import {
  checkAndUnlockAchievements,
  checkMilestone,
  updateStreak,
  updateUserLevel,
} from "@/lib/achievements";
import { prisma } from "@/lib/prisma";
import { logCapstoneDecision } from "@/lib/admin/actions";

const evaluateSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  feedback: z.string().min(20, "Feedback must be at least 20 characters"),
  checklist: z.record(z.string(), z.boolean()),
});


/**
 * POST /api/admin/projects/submissions/[submissionId]/evaluate
 * Evaluate a project submission. Admin only.
 */
export const POST = withAuth<{ submissionId: string }>(
  async (req: NextRequest, context: AuthContext<{ submissionId: string }>) => {
    const adminCheck = await isAdmin(context.userId);
    if (!adminCheck) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const { submissionId } = await context.params;

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const validation = evaluateSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid request", details: validation.error.issues },
          { status: 400 }
        );
      }

      const { decision, feedback, checklist } = validation.data;

      const submission = await prisma.projectSubmission.findUnique({
        where: { id: submissionId },
        select: {
          id: true,
          userId: true,
          projectId: true,
          status: true,
          project: {
            select: {
              id: true,
              title: true,
              xpReward: true,
              moduleId: true,
              module: {
                select: {
                  order: true,
                  lessons: { where: { archivedAt: null }, select: { id: true } },
                },
              },
            },
          },
        },
      });

      if (!submission) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      // An examiner who is also training doesn't grade their own capstone
      if (submission.userId === context.userId) {
        return NextResponse.json(
          { error: "You can't grade your own capstone. Another examiner will." },
          { status: 403 }
        );
      }

      if (submission.status !== "pending") {
        return NextResponse.json(
          { error: "Submission has already been evaluated" },
          { status: 409 }
        );
      }

      const moduleId = submission.project.moduleId;
      const lessonIds = submission.project.module.lessons.map((l) => l.id);
      const oldLevel =
        (await prisma.user.findUnique({ where: { id: submission.userId }, select: { level: true } }))?.level ?? 1;

      // The decision, the lessons it completes and the XP land together or not at all. The status
      // flips only while it's still pending, so when two examiners press at once just one request
      // decides (and awards); the other is told it's already graded.
      const decided = await prisma.$transaction(async (tx) => {
        const flipped = await tx.projectSubmission.updateMany({
          where: { id: submissionId, status: "pending" },
          data: { status: decision, feedback, evaluatedAt: new Date() },
        });
        if (flipped.count !== 1) return null;
        if (decision !== "approved") return { xp: 0 };

        // Every lesson of the module completed, in two statements rather than one per lesson
        const completedAt = new Date();
        await tx.progress.createMany({
          data: lessonIds.map((lessonId) => ({ userId: submission.userId, lessonId, completed: true, completedAt })),
          skipDuplicates: true,
        });
        await tx.progress.updateMany({
          where: { userId: submission.userId, lessonId: { in: lessonIds }, completed: false },
          data: { completed: true, completedAt },
        });
        // XP once per capstone: a resubmission approved after an earlier approval earns nothing more
        const approvedBefore = await tx.projectSubmission.findFirst({
          where: { userId: submission.userId, projectId: submission.projectId, status: "approved", id: { not: submissionId } },
          select: { id: true },
        });
        if (approvedBefore) return { xp: 0 };
        await tx.user.update({
          where: { id: submission.userId },
          data: { xp: { increment: submission.project.xpReward } },
        });
        return { xp: submission.project.xpReward };
        // The database is remote: allow more than Prisma's 5 s default for a handful of statements
      }, { maxWait: 10_000, timeout: 20_000 });

      if (!decided) {
        return NextResponse.json({ error: "Submission has already been evaluated" }, { status: 409 });
      }

      // On the record, like every other examiner action (Admin > Activity)
      await logCapstoneDecision(context.userId, submission.userId, decision, {
        submissionId,
        projectId: submission.projectId,
        project: submission.project.title,
        xp: decided.xp,
      });

      let xpGained = 0;
      let levelUp = false;
      let newLevel = 0;
      let milestone: 25 | 50 | 75 | 100 | null = null;
      const newAchievements: Awaited<ReturnType<typeof checkAndUnlockAchievements>> = [];

      if (decision === "approved") {
        if (decided.xp > 0) {
          xpGained = decided.xp;
          await updateUserLevel(submission.userId);

          const projectAchievements = await checkAndUnlockAchievements(submission.userId, {
            type: "project_complete",
            moduleOrder: submission.project.module.order,
          });
          newAchievements.push(...projectAchievements);

          await updateStreak(submission.userId);

          const userAfter = await prisma.user.findUnique({
            where: { id: submission.userId },
            select: { level: true, xp: true },
          });
          newLevel = userAfter?.level ?? oldLevel;
          levelUp = newLevel > oldLevel;

          if (userAfter) {
            const xpAchievements = await checkAndUnlockAchievements(submission.userId, {
              type: "xp_update",
              totalXp: userAfter.xp,
            });
            newAchievements.push(...xpAchievements);
          }

          milestone = await checkMilestone(submission.userId);
        }

        await invalidateCache(`module:${moduleId}:${submission.userId}`);
        await invalidateCache(`progress:module:${moduleId}:${submission.userId}`);
      }

      await invalidateCache(CacheKeys.project(submission.projectId, submission.userId));
      await invalidateUserCache(submission.userId);

      return NextResponse.json({
        success: true,
        checklist,
        xpGained,
        achievements: newAchievements,
        levelUp,
        newLevel,
        milestone,
      });
    } catch (error) {
      console.error("Error evaluating submission:", error);
      return NextResponse.json({ error: "Failed to evaluate submission" }, { status: 500 });
    }
  }
);
