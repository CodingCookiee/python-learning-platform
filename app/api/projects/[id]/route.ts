import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getCached } from "@/lib/cache";

/**
 * Cache key for a project detail by user
 */
function projectCacheKey(projectId: string, userId: string) {
  return `project:${projectId}:${userId}`;
}

/**
 * GET /api/projects/[id]
 * Get project details including module info and user submission status.
 * Cached for 1 hour per user.
 */
export const GET = withAuth(async (req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id } = await context.params;
    const cacheKey = projectCacheKey(id, context.userId);

    const response = await getCached(
      cacheKey,
      async () => {
        const project = await prisma.project.findUnique({
          where: { id },
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

        // Parse JSON fields stored as text
        let requirements: string[] = [];
        let successCriteria: string[] = [];

        try {
          requirements = JSON.parse(project.requirements) as string[];
        } catch {
          // Fall back to treating the raw text as a single-item list
          requirements = project.requirements ? [project.requirements] : [];
        }

        try {
          successCriteria = JSON.parse(project.successCriteria) as string[];
        } catch {
          successCriteria = project.successCriteria ? [project.successCriteria] : [];
        }

        const latestSubmission = project.submissions[0] ?? null;

        return {
          id: project.id,
          title: project.title,
          description: project.description,
          requirements,
          successCriteria,
          starterTemplate: project.starterTemplate ?? null,
          estimatedTime: project.estimatedTime,
          xpReward: project.xpReward,
          module: project.module,
          submission: latestSubmission
            ? {
                id: latestSubmission.id,
                status: latestSubmission.status,
                feedback: latestSubmission.feedback ?? null,
                submittedAt: latestSubmission.submittedAt,
                evaluatedAt: latestSubmission.evaluatedAt ?? null,
              }
            : null,
        };
      },
      3600 // Cache for 1 hour
    );

    if (!response) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
});
