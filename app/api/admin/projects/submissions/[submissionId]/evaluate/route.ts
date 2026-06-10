import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, isAdmin, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache, invalidateCache } from "@/lib/cache";

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
    // Admin guard
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

      const { prisma } = await import("@/lib/prisma");

      // Fetch the submission with its project
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

      // Only pending submissions can be evaluated
      if (submission.status !== "pending") {
        return NextResponse.json(
          { error: "Submission has already been evaluated" },
          { status: 409 }
        );
      }

      // Update the submission
      await prisma.projectSubmission.update({
        where: { id: submissionId },
        data: {
          status: decision,
          feedback,
          evaluatedAt: new Date(),
        },
      });

      // If approved: update module lesson progress
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

        // Invalidate module-level caches
        await invalidateCache(`module:${moduleId}:${submission.userId}`);
        await invalidateCache(`progress:module:${moduleId}:${submission.userId}`);
        await invalidateCache(`project:${submission.projectId}:${submission.userId}`);
      }

      // Invalidate user caches
      await invalidateUserCache(submission.userId);

      return NextResponse.json({ success: true, checklist });
    } catch (error) {
      console.error("Error evaluating submission:", error);
      return NextResponse.json({ error: "Failed to evaluate submission" }, { status: 500 });
    }
  }
);
