import { prisma } from "@/lib/prisma";
import { callWithLearnerKey } from "@/lib/ai/credentials";
import {
  decodeUploads,
  fetchGithubFiles,
  parseReview,
  reviewerSystemPrompt,
  reviewerUserTurn,
  selectFiles,
  type AiReview,
  type SourceFile,
} from "@/lib/ai/reviewer";
import { parseProjectListText } from "@/lib/project-content";

/** A review as stored on a submission: the model's verdicts, which model, and how many files it read */
export type StoredReview = AiReview & { model: string; files: number };

export type ReviewFailure = { ok: false; status: number; error: string; code?: string };
export type ReviewRun = { ok: true; review: StoredReview } | ReviewFailure;

interface ReviewableSubmission {
  /** The submission's JSON payload: uploads, or a GitHub URL, and the learner's notes */
  files: string;
  project: { title: string; description: string; requirements: string; successCriteria: string };
}

/**
 * Review a capstone submission's code against the capstone's criteria, on `callerId`'s own AI key:
 * the learner's for their own review, the examiner's when grading ("grade"). It reads the uploads,
 * or the public GitHub repo. The review is advice; nothing here changes the submission's status.
 */
export async function reviewSubmission(
  callerId: string,
  feature: "review" | "grade",
  submission: ReviewableSubmission
): Promise<ReviewRun> {
  let payload: { type?: string; files?: Array<{ name: string; content: string }>; url?: string; notes?: string | null };
  try {
    payload = JSON.parse(submission.files);
  } catch {
    return { ok: false, status: 400, error: "This submission can't be read." };
  }

  let source: SourceFile[];
  if (payload.type === "github" && payload.url) {
    const fetched = await fetchGithubFiles(payload.url);
    if (typeof fetched === "string") return { ok: false, status: 400, error: fetched };
    source = fetched;
  } else {
    source = decodeUploads(payload.files ?? []);
  }
  const { files, skipped } = selectFiles(source);
  if (files.length === 0) return { ok: false, status: 400, error: "There are no source files to review." };

  const criteria = parseProjectListText(submission.project.successCriteria);
  const call = await callWithLearnerKey(callerId, feature, {
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
  });
  if (!call.ok) return { ok: false, status: call.status, error: call.error, code: call.code };

  const review = parseReview(call.result.text, criteria);
  if (!review) return { ok: false, status: 502, error: "The model's review didn't come back in the expected shape. Try again." };
  return { ok: true, review: { ...review, model: call.model, files: files.length } };
}

/**
 * The examiner's AI review of a submission waiting to be graded, on the examiner's own key. It's
 * kept apart from the learner's own review, and only advises: the examiner still approves or sends
 * the work back.
 */
export async function reviewForExaminer(
  examinerId: string,
  submissionId: string
): Promise<{ ok: true; review: StoredReview; reviewedAt: string } | ReviewFailure> {
  const submission = await prisma.projectSubmission.findUnique({ where: { id: submissionId }, include: { project: true } });
  if (!submission) return { ok: false, status: 404, error: "Submission not found." };
  if (submission.status !== "pending") return { ok: false, status: 409, error: "This submission has already been graded." };

  const run = await reviewSubmission(examinerId, "grade", submission);
  if (!run.ok) {
    return run.code === "no_key" ? { ...run, error: "Add your AI key in Settings to review with AI." } : run;
  }
  const reviewedAt = new Date();
  await prisma.projectSubmission.update({
    where: { id: submission.id },
    data: { examinerAiReview: run.review, examinerAiReviewedAt: reviewedAt },
  });
  return { ok: true, review: run.review, reviewedAt: reviewedAt.toISOString() };
}
