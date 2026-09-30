import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getReviewQueue } from "@/lib/review";

/** GET /api/review: today's spaced-review queue and the week ahead */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  try {
    return NextResponse.json(await getReviewQueue(context.userId));
  } catch (error) {
    console.error("Error fetching review queue:", error);
    return NextResponse.json({ error: "Failed to fetch the review queue" }, { status: 500 });
  }
});
