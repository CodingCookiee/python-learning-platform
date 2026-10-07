import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { questEvent } from "@/lib/quest";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** POST /api/quest/event { step }: a step done in the browser (run-code, scratchpad, progress) */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  const limited = await rateLimit("questEvent", context.userId);
  if (!limited.ok) return tooManyRequests(limited);
  const result = await questEvent(context.userId, await req.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ quest: result.view, achievements: result.achievements });
});
