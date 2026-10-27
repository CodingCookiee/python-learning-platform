import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { CacheKeys, invalidateCache } from "@/lib/cache";
import { reviewSubmission } from "@/lib/ai/review-submission";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { choiceSchema } from "@/lib/ai/models";
import { z } from "zod";

// A review reads the project from GitHub (up to three 10 s calls) and gives the model up to 150 s, which
// together can reach 180 s; 240 leaves headroom and stays inside Fluid compute's 300 s limit
export const maxDuration = 240;

/**
 * POST /api/projects/[id]/review { choice? }
 * An AI review of the learner's latest submission for this capstone, on their own
 * key. It's saved on the submission for them and the examiner to read.
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id: projectId } = await context.params;
    const limited = await rateLimit("aiReview", context.userId);
    if (!limited.ok) return tooManyRequests(limited, "That's a few reviews already this hour.");

    const submission = await prisma.projectSubmission.findFirst({
      where: { userId: context.userId, projectId, project: { archivedAt: null } },
      orderBy: { submittedAt: "desc" },
      include: { project: true },
    });
    if (!submission) return NextResponse.json({ error: "Submit the project first." }, { status: 404 });

    // The model picked beside the review button; an empty body uses the default key's model
    const body = z.object({ choice: choiceSchema }).safeParse(await req.json().catch(() => ({})));
    if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const run = await reviewSubmission(context.userId, "review", submission, body.data.choice);
    if (!run.ok) return NextResponse.json({ error: run.error, code: run.code }, { status: run.status });

    const saved = await prisma.projectSubmission.update({
      where: { id: submission.id },
      data: { aiReview: run.review, aiReviewedAt: new Date() },
      select: { aiReview: true, aiReviewedAt: true },
    });
    await invalidateCache(CacheKeys.project(projectId, context.userId));
    return NextResponse.json({ aiReview: saved.aiReview, aiReviewedAt: saved.aiReviewedAt });
  } catch (error) {
    console.error("Error reviewing project:", error);
    return NextResponse.json({ error: "The review failed" }, { status: 500 });
  }
});
