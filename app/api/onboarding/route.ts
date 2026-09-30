import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";

const schema = z.object({
  experience: z.enum(["new", "other-language", "python"]),
  goal: z.enum(["python", "automation"]),
  weeklyHours: z.number().int().min(1).max(40),
});

/** POST /api/onboarding: the first-run answers (and later changes to the plan) */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Answer all three questions." }, { status: 400 });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: context.userId }, select: { onboardedAt: true } });
  await prisma.user.update({
    where: { id: context.userId },
    data: { ...parsed.data, onboardedAt: user.onboardedAt ?? new Date() },
  });
  return NextResponse.json({ ok: true });
});
