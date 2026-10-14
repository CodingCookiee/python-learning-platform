import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
import { startBeltTestOut, startCheckpoint } from "@/lib/checkpoint";

const startSchema = z.object({ moduleId: z.string().min(1), scope: z.enum(["module", "belt"]).default("module") });

/**
 * POST /api/checkpoints
 * Start the learner's checkpoint for a module, or resume the one already open.
 * Before the module's lessons are done this is a placement test. With
 * `scope: "belt"`, the belt test-out offered from that module's page instead.
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const limited = await rateLimit("checkpointStart", context.userId);
    if (!limited.ok) return tooManyRequests(limited);
    const parsed = startSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { moduleId, scope } = parsed.data;
    const result = scope === "belt" ? await startBeltTestOut(context.userId, moduleId) : await startCheckpoint(context.userId, moduleId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await invalidateUserCache(context.userId);
    return NextResponse.json({ attemptId: result.attemptId });
  } catch (error) {
    console.error("Error starting grading:", error);
    return NextResponse.json({ error: "Failed to start the grading" }, { status: 500 });
  }
});
