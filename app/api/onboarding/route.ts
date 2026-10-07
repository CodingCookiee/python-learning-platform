import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { saveOnboarding } from "@/lib/onboarding";

/** POST /api/onboarding: the first-run answers (and later changes to the plan) */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  const result = await saveOnboarding(context.userId, await req.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, next: result.next });
});
