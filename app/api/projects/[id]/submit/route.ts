import { NextRequest, NextResponse } from "next/server";
import { notifySubmission } from "@/lib/admin/notifications";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { CacheKeys, invalidateCache, invalidateUserCache } from "@/lib/cache";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { z } from "zod";
import { MAX_FILES, TOO_MANY_FILES, base64Bytes, uploadProblem } from "@/lib/capstone-upload";

const GITHUB_URL_REGEX = /^https?:\/\/(www\.)?github\.com\/.+\/.+/i;

const submitSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("files"),
    files: z
      .array(
        z.object({
          name: z
            .string()
            .min(1)
            .max(200)
            .refine((n) => !n.includes("..") && !/^[\\/]/.test(n), "File names can't point outside the project"),
          // What the browser says; the limits below measure the content itself (lib/capstone-upload.ts)
          size: z.number().int().min(0),
          type: z.string().max(100),
          // base64, so about 4/3 of the file's size
          content: z.string().min(1).max(1_400_000),
        })
      )
      .min(1, "At least one file is required")
      .max(MAX_FILES, TOO_MANY_FILES)
      .superRefine((files, ctx) => {
        const problem = uploadProblem(files);
        if (problem) ctx.addIssue({ code: "custom", message: problem });
      })
      // Stored with the size of what arrived, not what was declared
      .transform((files) => files.map((f) => ({ ...f, size: base64Bytes(f.content) }))),
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
 * Rewards are granted only after admin approval.
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id: projectId } = await context.params;
    const limited = await rateLimit("projectSubmit", context.userId);
    if (!limited.ok) return tooManyRequests(limited);

    // Validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = submitSchema.safeParse(body);
    if (!validation.success) {
      // The first problem in words the learner can act on (a size limit, a missing file)
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check project exists
    const project = await prisma.project.findFirst({
      where: { id: projectId, archivedAt: null, module: { archivedAt: null } },
      select: { id: true, title: true },
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

    // Every admin hears about it (the bell in the header)
    const learner = await prisma.user.findUnique({ where: { id: context.userId }, select: { name: true, email: true } });
    if (learner) await notifySubmission(submission, learner, project);

    // Invalidate project detail cache so the latest status shows immediately
    await invalidateCache(CacheKeys.project(projectId, context.userId));
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
