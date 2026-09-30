import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getLabForUser } from "@/lib/labs";

/** GET /api/labs/[lessonId]: the lesson's lab, the learner's lab URL and their latest check */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext<{ lessonId: string }>) => {
  const { lessonId } = await context.params;
  const lab = await getLabForUser(context.userId, lessonId);
  if (!lab) return NextResponse.json({ error: "This lesson has no lab" }, { status: 404 });
  return NextResponse.json(lab);
});
