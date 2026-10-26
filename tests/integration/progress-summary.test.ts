import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getProgressSummary } from "@/lib/progress-summary";
import { makeLearner } from "./helpers";

describe("the progress summary", () => {
  it("never carries a capstone's files, feedback or the examiner's private AI draft", async () => {
    const learner = await makeLearner("summary");
    try {
      const project = await prisma.project.findFirstOrThrow({
        where: { archivedAt: null, module: { archivedAt: null, trackId: { not: null } } },
        select: { id: true, title: true },
      });
      await prisma.projectSubmission.create({
        data: {
          userId: learner.user.id,
          projectId: project.id,
          status: "approved",
          files: JSON.stringify({ type: "files", files: [{ name: "main.py", content: "U0VDUkVULUZJTEUtQ09OVEVOVA==" }] }),
          feedback: "PRIVATE-FEEDBACK",
          examinerAiReview: { summary: "PRIVATE-EXAMINER-DRAFT" },
          evaluatedAt: new Date(),
        },
      });

      const summary = await getProgressSummary(learner.user.id);
      // It's what GET /api/progress sends and what the cache stores
      const sent = JSON.stringify(summary);
      expect(summary.recentActivity.projects).toHaveLength(1);
      expect(summary.recentActivity.projects[0]!.project.title).toBe(project.title);
      expect(sent).not.toContain("PRIVATE-EXAMINER-DRAFT");
      expect(sent).not.toContain("PRIVATE-FEEDBACK");
      expect(sent).not.toContain("U0VDUkVULUZJTEUtQ09OVEVOVA==");
    } finally {
      await learner.cleanup();
    }
  });
});
