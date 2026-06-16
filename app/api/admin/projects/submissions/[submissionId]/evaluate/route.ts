import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, isAdmin, AuthContext } from "@/lib/api-auth";
import { invalidateCache, invalidateUserCache } from "@/lib/cache";
import {
  checkAndUnlockAchievements,
  checkMilestone,
  updateStreak,
  updateUserLevel,
} from "@/lib/achievements";
import { prisma } from "@/lib/prisma";

const evaluateSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  feedback: z.string().min(20, "Feedback must be at least 20 characters"),
  checklist: z.record(z.string(), z.boolean()),
});

function projectCacheKey(projectId: string, userId: string) {
  return `project:${projectId}:${userId}`;
}

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
              moduleId: true,
              module: {
                select: {
                  lessons: { select: { id: true } },
                },
              },
            },
          },
        },
      });

      if (!submission) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      if (submission.status !== "pending") {
        return NextResponse.json(
          { error: "Submission has already been evaluated" },
          { status: 409 }
        );
      }

      await prisma.projectSubmission.update({
        where: { id: submissionId },
        data: {
          status: decision,
          feedback,
          evaluatedAt: new Date(),
        },
      });

      let xpGained = 0;
      let levelUp = false;
      let newLevel = 0;
      let milestone: 25 | 50 | 75 | 100 | null = null;
      const newAchievements: Awaited<ReturnType<typeof checkAndUnlockAchievements>> = [];

      if (decision === "approved") {
        const moduleId = submission.project.moduleId;
        const lessonIds = submission.project.module.lessons.map((l) => l.id);

        for (const lessonId of lessonIds) {
          await prisma.progress.upsert({
            where: { userId_lessonId: { userId: submission.userId, lessonId } },
            create: {
              userId: submission.userId,
              lessonId,
              completed: true,
              completedAt: new Date(),
            },
            update: {
              completed: true,
              completedAt: new Date(),
            },
          });
        }

        const previousApprovedSubmission = await prisma.projectSubmission.findFirst({
          where: {
            userId: submission.userId,
            projectId: submission.projectId,
            status: "approved",
            id: { not: submissionId },
          },
          select: { id: true },
        });

        if (!previousApprovedSubmission) {
          const project = await prisma.project.findUnique({
            where: { id: submission.projectId },
            select: {
              xpReward: true,
              module: { select: { order: true } },
            },
          });

          if (project) {
            xpGained = project.xpReward;

            const userBefore = await prisma.user.findUnique({
              where: { id: submission.userId },
              select: { level: true },
            });
            const oldLevel = userBefore?.level ?? 1;

            await prisma.user.update({
              where: { id: submission.userId },
              data: { xp: { increment: xpGained } },
            });
            await updateUserLevel(submission.userId);

            const projectAchievements = await checkAndUnlockAchievements(submission.userId, {
              type: "project_complete",
              moduleOrder: project.module.order,
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
        }

        await invalidateCache(`module:${moduleId}:${submission.userId}`);
        await invalidateCache(`progress:module:${moduleId}:${submission.userId}`);
      }

      await invalidateCache(projectCacheKey(submission.projectId, submission.userId));
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
