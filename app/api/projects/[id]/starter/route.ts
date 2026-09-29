import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";

/**
 * GET /api/projects/[id]/starter
 * Download a capstone's starter file (its source code is stored with the project).
 */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext<{ id: string }>) => {
  const { id } = await context.params;
  const project = await prisma.project.findFirst({
    where: { id, archivedAt: null },
    select: { slug: true, starterTemplate: true },
  });
  const code = project?.starterTemplate;
  if (!project || !code || code.startsWith("/") || code.startsWith("http")) {
    return NextResponse.json({ error: "No starter file for this project" }, { status: 404 });
  }
  const filename = `${(project.slug ?? "starter").replace(/[^a-z0-9-]/gi, "")}-starter.py`;
  return new NextResponse(code, {
    headers: {
      "Content-Type": "text/x-python; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
