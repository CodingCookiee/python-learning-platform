import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLink, viewOf } from "@/lib/ci/links";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { CacheKeys, getCached } from "@/lib/cache";
import { formatProjectEstimatedTime } from "@/lib/project-time";
import { starterTemplateHref } from "@/lib/project-template";
import { parseProjectListText } from "@/lib/project-content";


/**
 * GET /api/projects/[id]
 * Get project details including module info and user submission status.
 * Cached for 1 hour per user.
 */
export const GET = withAuth(async (req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id } = await context.params;
    const cacheKey = CacheKeys.project(id, context.userId);

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
              where: { userId: context.userId },
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

    if (!response) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    // Not cached: whether the learner has an AI key can change at any time
    const aiReady = (await prisma.aiCredential.count({ where: { userId: context.userId } })) > 0;
    const acceptance = await prisma.project.findUnique({ where: { id }, select: { acceptance: true } });
    const hasAcceptance = Boolean(acceptance?.acceptance);
    const link = hasAcceptance ? await getLink(context.userId, "capstone", id) : null;
    return NextResponse.json({
      ...response,
      aiReady,
      hasAcceptance,
      ci: link ? viewOf(link, (response as { title: string }).title) : null,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
});
