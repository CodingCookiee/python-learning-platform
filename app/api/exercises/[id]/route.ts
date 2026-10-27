import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getDrillForUser } from "@/lib/drills";
import { readingTooFast } from "@/lib/reading-pace";
import { tooManyRequests } from "@/lib/rate-limit";

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
    // The same pace as the drill page (lib/reading-pace.ts), so the course can't be copied out from here instead
    const tooFast = await readingTooFast(context.userId, `drill:${drill.id}`);
    if (tooFast) return tooManyRequests(tooFast, "You've opened a lot of new lessons and drills in a short time.");
    return NextResponse.json(drill);
  } catch (error) {
    console.error("Error fetching exercise:", error);
    return NextResponse.json({ error: "Failed to fetch exercise" }, { status: 500 });
  }
});
