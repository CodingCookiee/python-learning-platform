import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { skipQuest } from "@/lib/quest";

/** POST /api/quest/skip: skip the quest, or decline the offer when it was never started */
export const POST = withAuth(async (_req: NextRequest, context: AuthContext) => {
  return NextResponse.json({ quest: await skipQuest(context.userId) });
});
