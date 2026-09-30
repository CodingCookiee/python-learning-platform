import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getCheckpointAttempt } from "@/lib/checkpoint";

/** GET /api/checkpoints/[id]: one of the learner's checkpoint attempts, with its drills */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id } = await context.params;
    const attempt = await getCheckpointAttempt(context.userId, id);
    if (!attempt) return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
    return NextResponse.json(attempt);
  } catch (error) {
    console.error("Error fetching checkpoint:", error);
    return NextResponse.json({ error: "Failed to fetch the checkpoint" }, { status: 500 });
  }
});
