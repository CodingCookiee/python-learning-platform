import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { resumeQuest } from "@/lib/quest";

/** POST /api/quest/resume: pick a skipped quest up again, keeping its steps */
export const POST = withAuth(async (_req: NextRequest, context: AuthContext) => {
  return NextResponse.json({ quest: await resumeQuest(context.userId) });
});
