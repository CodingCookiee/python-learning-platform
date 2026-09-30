import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { CacheKeys, invalidateCache } from "@/lib/cache";
import { callWithLearnerKey } from "@/lib/ai/credentials";
import {
  decodeUploads,
  fetchGithubFiles,
  parseReview,
  reviewerSystemPrompt,
  reviewerUserTurn,
  selectFiles,
  type SourceFile,
} from "@/lib/ai/reviewer";
import { parseProjectListText } from "@/lib/project-content";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/projects/[id]/review
 * An AI review of the learner's latest submission for this capstone, on their own
 * key. It's saved on the submission for them and the examiner to read.
 */
export const POST = withAuth(async (_req: NextRequest, context: AuthContext<{ id: string }>) => {
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

    let payload: { type?: string; files?: Array<{ name: string; content: string }>; url?: string; notes?: string | null };
    try {
      payload = JSON.parse(submission.files);
    } catch {
      return NextResponse.json({ error: "This submission can't be read." }, { status: 400 });
    }

    let source: SourceFile[];
    if (payload.type === "github" && payload.url) {
      const fetched = await fetchGithubFiles(payload.url);
      if (typeof fetched === "string") return NextResponse.json({ error: fetched }, { status: 400 });
      source = fetched;
    } else {
      source = decodeUploads(payload.files ?? []);
    }
    const { files, skipped } = selectFiles(source);
    if (files.length === 0) return NextResponse.json({ error: "There are no source files to review." }, { status: 400 });

    const criteria = parseProjectListText(submission.project.successCriteria);
    const call = await callWithLearnerKey(
      context.userId,
      "review",
      {
        system: reviewerSystemPrompt(),
        messages: [
          {
            role: "user",
            content: reviewerUserTurn({
              title: submission.project.title,
              brief: submission.project.description,
              requirements: parseProjectListText(submission.project.requirements),
              criteria,
              files,
              skipped,
              notes: payload.notes ?? null,
            }),
          },
        ],
        maxTokens: 3_000,
        timeoutMs: 150_000,
      }
    );
    if (!call.ok) return NextResponse.json({ error: call.error, code: call.code }, { status: call.status });

    const review = parseReview(call.result.text, criteria);
    if (!review) {
      return NextResponse.json({ error: "The model's review didn't come back in the expected shape. Try again." }, { status: 502 });
    }
    const saved = await prisma.projectSubmission.update({
      where: { id: submission.id },
      data: { aiReview: { ...review, model: call.model, files: files.length }, aiReviewedAt: new Date() },
      select: { aiReview: true, aiReviewedAt: true },
    });
    await invalidateCache(CacheKeys.project(projectId, context.userId));
    return NextResponse.json({ aiReview: saved.aiReview, aiReviewedAt: saved.aiReviewedAt });
  } catch (error) {
    console.error("Error reviewing project:", error);
    return NextResponse.json({ error: "The review failed" }, { status: 500 });
  }
});
