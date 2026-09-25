import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getDrillForUser } from "@/lib/drills";

/**
 * GET /api/exercises/[id]
 * A drill as the learner sees it: prompt, starter, tests, hints, their attempt
 * stats, and the reference solution once earned. 404 for archived drills or
 * drills in modules the learner hasn't unlocked.
 */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id } = await context.params;
    const drill = await getDrillForUser(id, context.userId);
    if (!drill) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    return NextResponse.json(drill);
  } catch (error) {
    console.error("Error fetching exercise:", error);
    return NextResponse.json({ error: "Failed to fetch exercise" }, { status: 500 });
  }
});
