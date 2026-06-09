import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
import { checkAndUnlockAchievements, updateUserLevel } from "@/lib/achievements";
import { z } from "zod";

const projectSubmissionSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  files: z.string().min(1, "Files are required"),
  githubUrl: z.string().url().optional(),
});

/**
 * POST /api/progress/project
 * Submit a project for evaluation
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const body = await req.json();
    const validation = projectSubmissionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { projectId, files, githubUrl } = validation.data;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { module: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const submission = await prisma.projectSubmission.create({
      data: {
        userId: context.userId,
        projectId,
        files: JSON.stringify({ files, githubUrl }),
        status: "pending",
      },
    });

    // MVP: auto-approve
    const approvedSubmission = await prisma.projectSubmission.update({
      where: { id: submission.id },
      data: {
        status: "approved",
        evaluatedAt: new Date(),
        feedback: "Great work! Your project meets all the requirements.",
      },
    });

    await prisma.user.update({
      where: { id: context.userId },
      data: { xp: { increment: project.xpReward } },
    });
    await updateUserLevel(context.userId);

    const newAchievements = await checkAndUnlockAchievements(context.userId, {
      type: "project_complete",
      moduleOrder: project.module.order,
    });

    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { xp: true },
    });
    if (user) {
      const xpAchievements = await checkAndUnlockAchievements(context.userId, {
        type: "xp_update",
        totalXp: user.xp,
      });
      newAchievements.push(...xpAchievements);
    }

    await invalidateUserCache(context.userId);

    return NextResponse.json({
      success: true,
      submission: approvedSubmission,
      xpGained: project.xpReward,
      achievements: newAchievements,
    });
  } catch (error) {
    console.error("Error submitting project:", error);
    return NextResponse.json({ error: "Failed to submit project" }, { status: 500 });
  }
});
