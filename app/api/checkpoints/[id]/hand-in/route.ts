import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
import { handInCheckpoint } from "@/lib/checkpoint";

/**
 * POST /api/checkpoints/[id]/hand-in
 * Close the attempt now and score it. Drills not passed by then count as failed.
 */
export const POST = withAuth(async (_req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id } = await context.params;
    const result = await handInCheckpoint(context.userId, id);
    if (!result) return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
    await invalidateUserCache(context.userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error handing in checkpoint:", error);
    return NextResponse.json({ error: "Failed to hand in the checkpoint" }, { status: 500 });
  }
});
