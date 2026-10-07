import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { startQuest } from "@/lib/quest";

/** POST /api/quest/start: start the quest (an existing learner from the dashboard); drill steps their history covers are ticked */
export const POST = withAuth(async (_req: NextRequest, context: AuthContext) => {
  return NextResponse.json({ quest: await startQuest(context.userId) });
});
