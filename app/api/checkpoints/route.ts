import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
import { startCheckpoint } from "@/lib/checkpoint";

const startSchema = z.object({ moduleId: z.string().min(1) });

/**
 * POST /api/checkpoints
 * Start the learner's checkpoint for a module, or resume the one already open.
 * Before the module's lessons are done this is a placement test.
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const parsed = startSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const result = await startCheckpoint(context.userId, parsed.data.moduleId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await invalidateUserCache(context.userId);
    return NextResponse.json({ attemptId: result.attemptId });
  } catch (error) {
    console.error("Error starting checkpoint:", error);
    return NextResponse.json({ error: "Failed to start the checkpoint" }, { status: 500 });
  }
});
