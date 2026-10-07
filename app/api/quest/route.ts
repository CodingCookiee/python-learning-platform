import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getQuest } from "@/lib/quest";

/** GET /api/quest: the learner's first-session quest for the panel, or null */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  return NextResponse.json({ quest: await getQuest(context.userId) });
});
