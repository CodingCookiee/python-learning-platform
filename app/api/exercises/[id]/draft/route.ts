import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { encodeDraft } from "@/lib/drill-files";

const schema = z.object({
  code: z.string().max(100_000),
  files: z.record(z.string().max(200), z.string().max(100_000)).optional(),
});

/**
 * PUT /api/exercises/[id]/draft { code }
 * Autosave the learner's practice code for a drill (the drill page debounces this),
 * so it's waiting for them on any device.
 */
export const PUT = withAuth(async (req: NextRequest, context: AuthContext<{ id: string }>) => {
  const { id: exerciseId } = await context.params;
  const limited = await rateLimit("draftSave", context.userId);
  if (!limited.ok) return tooManyRequests(limited);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const exists = await prisma.exercise.count({ where: { id: exerciseId, archivedAt: null } });
  if (!exists) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  const draft = await prisma.drillDraft.upsert({
    where: { userId_exerciseId: { userId: context.userId, exerciseId } },
    create: { userId: context.userId, exerciseId, code: encodeDraft(parsed.data.code, parsed.data.files) },
    update: { code: encodeDraft(parsed.data.code, parsed.data.files) },
    select: { updatedAt: true },
  });
  return NextResponse.json({ savedAt: draft.updatedAt.toISOString() });
});
