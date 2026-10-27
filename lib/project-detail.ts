import { prisma } from "@/lib/prisma";
import { getLink, viewOf } from "@/lib/ci/links";
import { CacheKeys, getCached } from "@/lib/cache";
import { formatProjectEstimatedTime } from "@/lib/project-time";
import { starterTemplateHref } from "@/lib/project-template";
import { parseProjectListText } from "@/lib/project-content";
import { getSavedKeys } from "@/lib/ai/credentials";

/**
 * A capstone with this learner's latest submission, whether they have an AI key, and their GitHub
 * Actions link. The project part is cached for an hour per learner; the rest is read fresh, since
 * it can change at any time. Null when the capstone doesn't exist. The capstone page calls this
 * directly; GET /api/projects/[id] returns it to the browser.
 */
export async function getProjectDetail(id: string, userId: string) {
  const cacheKey = CacheKeys.project(id, userId);
  const response = await getCached(
    cacheKey,
    async () => {
      const project = await prisma.project.findFirst({
        where: { id, archivedAt: null, module: { archivedAt: null } },
        include: {
          module: {
            select: {
              id: true,
              title: true,
              order: true,
              phase: true,
            },
          },
          submissions: {
            where: { userId },
            orderBy: { submittedAt: "desc" },
            take: 1,
          },
        },
      });

      if (!project) {
        return null;
      }

      const requirements = parseProjectListText(project.requirements);
      const successCriteria = parseProjectListText(project.successCriteria);

      const latestSubmission = project.submissions[0] ?? null;

      return {
        id: project.id,
        title: project.title,
        summary: project.summary,
        description: project.description,
        requirements,
        successCriteria,
        starterTemplate: starterTemplateHref(project.id, project.starterTemplate),
        estimatedTime: formatProjectEstimatedTime(project.estimatedTime),
        xpReward: project.xpReward,
        module: project.module,
        submission: latestSubmission
          ? {
              id: latestSubmission.id,
              status: latestSubmission.status,
              feedback: latestSubmission.feedback ?? null,
              submittedAt: latestSubmission.submittedAt,
              evaluatedAt: latestSubmission.evaluatedAt ?? null,
              aiReview: latestSubmission.aiReview ?? null,
              aiReviewedAt: latestSubmission.aiReviewedAt ?? null,
            }
          : null,
      };
    },
    3600 // Cache for 1 hour
  );

  if (!response) return null;
  // Not cached: whether the learner has an AI key can change at any time
  const [aiKeys, acceptance] = await Promise.all([
    getSavedKeys(userId),
    prisma.project.findUnique({ where: { id }, select: { acceptance: true } }),
  ]);
  const hasAcceptance = Boolean(acceptance?.acceptance);
  const link = hasAcceptance ? await getLink(userId, "capstone", id) : null;
  return {
    ...response,
    aiKeys,
    hasAcceptance,
    ci: link ? viewOf(link, (response as { title: string }).title) : null,
  };
}
