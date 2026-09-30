import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getWeekDraft, saveCurrentWeek } from "@/lib/learning-log";

const text = z.string().max(2_000).default("");
const schema = z.object({
  hours: z.number().min(0).max(100),
  built: text,
  learned: text,
  stuck: text,
  nextGoal: text,
  question: text,
});

/** GET /api/log: this week's check-in freshly pre-filled from activity (not saved) */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  return NextResponse.json(await getWeekDraft(context.userId));
});

/** PUT /api/log: save this week's check-in */
export const PUT = withAuth(async (req: NextRequest, context: AuthContext) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const entry = await saveCurrentWeek(context.userId, parsed.data);
  return NextResponse.json({ savedAt: entry.updatedAt.toISOString() });
});
