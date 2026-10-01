import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { suiteFor, verifyLink, viewOf, type CiKind } from "@/lib/ci/links";

async function owned(userId: string, id: string) {
  const link = await prisma.ciLink.findUnique({ where: { id } });
  return link && link.userId === userId ? link : null;
}

/** GET /api/ci/links/[id]: the connection's status, confirming a reported run with GitHub when one is waiting */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext<{ id: string }>) => {
  const { id } = await context.params;
  let link = await owned(context.userId, id);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (link.status === "reported") link = (await verifyLink(link.id)) ?? link;
  const suite = await suiteFor(link.kind as CiKind, link.targetId);
  return NextResponse.json(viewOf(link, suite?.title ?? ""));
});

/** DELETE /api/ci/links/[id]: disconnect the repo */
export const DELETE = withAuth(async (_req: NextRequest, context: AuthContext<{ id: string }>) => {
  const { id } = await context.params;
  const link = await owned(context.userId, id);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.ciLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
