import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateCache, invalidateUserCache } from "@/lib/cache";
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
          content: z.string().min(1),
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

function projectCacheKey(projectId: string, userId: string) {
  return `project:${projectId}:${userId}`;
}

/**
 * POST /api/projects/[id]/submit
 * Submit a project (file metadata list or GitHub repo link).
 * Rewards are granted only after admin approval.
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
      select: { id: true },
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

    // Create submission
    const submission = await prisma.projectSubmission.create({
      data: {
        userId: context.userId,
        projectId,
        files: filesPayload,
        status: "pending",
      },
    });

    // Invalidate project detail cache so the latest status shows immediately
    await invalidateCache(projectCacheKey(projectId, context.userId));
    await invalidateUserCache(context.userId);

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
    });
  } catch (error) {
    console.error("Error submitting project:", error);
    return NextResponse.json({ error: "Failed to submit project" }, { status: 500 });
  }
});
