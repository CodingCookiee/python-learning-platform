import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
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
export const POST = withAuth(async (req: NextRequest, context: { userId: string }) => {
  try {
    const body = await req.json();
    const validation = projectSubmissionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { projectId, files, githubUrl } = validation.data;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { module: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create submission
    const submission = await prisma.projectSubmission.create({
      data: {
        userId: context.userId,
        projectId,
        files: JSON.stringify({ files, githubUrl }),
        status: "pending", // pending, approved, rejected
      },
    });

    // For MVP, auto-approve projects (in production, this would be manual review)
    const autoApprove = true;

    if (autoApprove) {
      const approvedSubmission = await prisma.projectSubmission.update({
        where: { id: submission.id },
        data: {
          status: "approved",
          evaluatedAt: new Date(),
          feedback: "Great work! Your project meets all the requirements.",
        },
      });

      // Award XP
      await prisma.user.update({
        where: { id: context.userId },
        data: {
          xp: { increment: project.xpReward },
        },
      });

      // Check for achievements
      const achievements = await checkProjectAchievements(context.userId, project.module.order);

      // Invalidate user caches
      await invalidateUserCache(context.userId);

      return NextResponse.json({
        success: true,
        submission: approvedSubmission,
        xpGained: project.xpReward,
        achievements,
      });
    }

    return NextResponse.json({
      success: true,
      submission,
      message: "Project submitted for review",
    });
  } catch (error) {
    console.error("Error submitting project:", error);
    return NextResponse.json({ error: "Failed to submit project" }, { status: 500 });
  }
});

/**
 * Check for project-related achievements
 */
async function checkProjectAchievements(userId: string, moduleOrder: number): Promise<string[]> {
  const achievements: string[] = [];

  try {
    // Module-specific project achievements
    const achievementNames: Record<number, string> = {
      1: "Calculator Pro",
      2: "Task Master",
      3: "Text Wizard",
    };

    const achievementName = achievementNames[moduleOrder];
    if (achievementName) {
      await unlockAchievement(userId, achievementName);
      achievements.push(achievementName);
    }
  } catch (error) {
    console.error("Error checking project achievements:", error);
  }

  return achievements;
}

/**
 * Unlock an achievement for a user
 */
async function unlockAchievement(userId: string, achievementName: string): Promise<void> {
  try {
    const achievement = await prisma.achievement.findUnique({
      where: { name: achievementName },
    });

    if (!achievement) return;

    // Check if already unlocked
    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
        },
      },
    });

    if (existing) return;

    // Unlock achievement
    await prisma.userAchievement.create({
      data: {
        userId,
        achievementId: achievement.id,
      },
    });

    // Award XP
    if (achievement.xpReward > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          xp: { increment: achievement.xpReward },
        },
      });
    }
  } catch (error) {
    console.error("Error unlocking achievement:", error);
  }
}
