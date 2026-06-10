import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
import {
  checkAndUnlockAchievements,
  updateStreak,
  updateUserLevel,
  checkMilestone,
} from "@/lib/achievements";
import { z } from "zod";

const GITHUB_URL_REGEX = /^https?:\/\/(www\.)?github\.com\/.+\/.+/i;

const submitSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("files"),
    files: z
      .array(
        z.object({
          name: z.string().min(1),
          size: z.number().int().min(0),
          type: z.string(),
        })
      )
      .min(1, "At least one file is required"),
    notes: z.string().max(2000).optional(),
  }),
  z.object({
    type: z.literal("github"),
    githubUrl: z
      .string()
      .min(1, "GitHub URL is required")
      .regex(GITHUB_URL_REGEX, "Must be a valid github.com URL"),
    notes: z.string().max(2000).optional(),
  }),
]);

/**
 * POST /api/projects/[id]/submit
 * Submit a project (file metadata list or GitHub repo link).
 * Awards XP on first-ever submission for the project; checks achievements.
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id: projectId } = await context.params;

    // Validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = submitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, xpReward: true, module: { select: { order: true } } },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Prevent duplicate pending submissions
    const pendingSubmission = await prisma.projectSubmission.findFirst({
      where: { userId: context.userId, projectId, status: "pending" },
      select: { id: true },
    });
    if (pendingSubmission) {
      return NextResponse.json(
        { error: "You already have a pending submission for this project" },
        { status: 409 }
      );
    }

    // Build the JSON payload stored in the `files` column
    const filesPayload =
      data.type === "github"
        ? JSON.stringify({ type: "github", url: data.githubUrl, notes: data.notes ?? null })
        : JSON.stringify({
            type: "files",
            files: data.files,
            notes: data.notes ?? null,
          });

    // Determine if this is the user's very first submission for this project
    const previousSubmission = await prisma.projectSubmission.findFirst({
      where: { userId: context.userId, projectId },
      select: { id: true },
    });
    const isFirstSubmission = !previousSubmission;

    // Create submission
    const submission = await prisma.projectSubmission.create({
      data: {
        userId: context.userId,
        projectId,
        files: filesPayload,
        status: "pending",
      },
    });

    // Award XP only on first submission
    let xpGained = 0;
    let levelUp = false;
    let newLevel = 0;
    const newAchievements: Awaited<ReturnType<typeof checkAndUnlockAchievements>> = [];

    // Capture level before any XP changes
    const userBefore = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { level: true },
    });
    const oldLevel = userBefore?.level ?? 1;

    if (isFirstSubmission) {
      xpGained = project.xpReward;
      await prisma.user.update({
        where: { id: context.userId },
        data: { xp: { increment: xpGained } },
      });
      await updateUserLevel(context.userId);

      // Check project-specific achievements
      const projectAchievements = await checkAndUnlockAchievements(context.userId, {
        type: "project_complete",
        moduleOrder: project.module.order,
      });
      newAchievements.push(...projectAchievements);

      // Update streak
      await updateStreak(context.userId);

      // Check XP threshold achievements
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
    }

    // Invalidate user caches
    await invalidateUserCache(context.userId);

    // Capture level after all XP updates
    const userAfter = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { level: true },
    });
    newLevel = userAfter?.level ?? oldLevel;
    levelUp = newLevel > oldLevel;

    const milestone = isFirstSubmission ? await checkMilestone(context.userId) : null;

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      xpGained,
      achievements: newAchievements,
      levelUp,
      newLevel,
      milestone,
    });
  } catch (error) {
    console.error("Error submitting project:", error);
    return NextResponse.json({ error: "Failed to submit project" }, { status: 500 });
  }
});
