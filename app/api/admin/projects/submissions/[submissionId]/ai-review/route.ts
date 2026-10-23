import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAdmin, AuthContext } from "@/lib/api-auth";
import { reviewForExaminer } from "@/lib/ai/review-submission";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

// A review reads the project (GitHub included) and gives the model up to 150 s
export const maxDuration = 180;

/**
 * POST /api/admin/projects/submissions/[submissionId]/ai-review
 * An AI review of a submission waiting to be graded, on the examiner's own key. Admin only. It
 * advises (verdicts per criterion, security notes, next steps); the examiner still decides.
 */
export const POST = withAuth<{ submissionId: string }>(
  async (_req: NextRequest, context: AuthContext<{ submissionId: string }>) => {
    if (!(await isAdmin(context.userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      const limited = await rateLimit("examinerReview", context.userId);
      if (!limited.ok) return tooManyRequests(limited, "That's a lot of AI reviews this hour.");

      const { submissionId } = await context.params;
      const result = await reviewForExaminer(context.userId, submissionId);
      if (!result.ok) return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
      return NextResponse.json({ review: result.review, reviewedAt: result.reviewedAt });
    } catch (error) {
      console.error("Error running the examiner's AI review:", error);
      return NextResponse.json({ error: "The review failed" }, { status: 500 });
    }
  }
);
