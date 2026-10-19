import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getProjectDetail } from "@/lib/project-detail";

/**
 * GET /api/projects/[id]
 * Project details including module info and the learner's submission (lib/project-detail.ts)
 */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id } = await context.params;
    const detail = await getProjectDetail(id, context.userId);
    if (!detail) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
});
