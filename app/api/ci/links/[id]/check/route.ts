import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { suiteFor, verifyLink, viewOf, type CiKind } from "@/lib/ci/links";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** POST /api/ci/links/[id]/check: look the latest run up on GitHub now */
export const POST = withAuth(async (_req: NextRequest, context: AuthContext<{ id: string }>) => {
  const { id } = await context.params;
  const limited = await rateLimit("labVerify", context.userId);
  if (!limited.ok) return tooManyRequests(limited);
  const link = await prisma.ciLink.findUnique({ where: { id } });
  if (!link || link.userId !== context.userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const checked = (await verifyLink(id, true)) ?? link;
  const suite = await suiteFor(checked.kind as CiKind, checked.targetId);
  return NextResponse.json(viewOf(checked, suite?.title ?? ""));
});
