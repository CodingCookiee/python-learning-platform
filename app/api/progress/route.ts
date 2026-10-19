import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getProgressSummary } from "@/lib/progress-summary";

/**
 * GET /api/progress
 * The learner's progress summary (lib/progress-summary.ts)
 */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  try {
    return NextResponse.json(await getProgressSummary(context.userId));
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
});
