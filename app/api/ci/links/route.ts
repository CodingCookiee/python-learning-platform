import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getSequentialModuleUnlockMap } from "@/lib/module-access";
import { getRepo, parseRepo } from "@/lib/ci/github";
import { connectRepo, suiteFor, viewOf } from "@/lib/ci/links";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  kind: z.enum(["capstone", "lab"]),
  targetId: z.string().min(1),
  repo: z.string().min(3).max(300),
});

/**
 * PUT /api/ci/links { kind, targetId, repo }
 * Connect a public GitHub repo to a capstone's acceptance tests or a github lab,
 * and get the workflow file to add to it.
 */
export const PUT = withAuth(async (req: NextRequest, context: AuthContext) => {
  const limited = await rateLimit("labVerify", context.userId);
  if (!limited.ok) return tooManyRequests(limited);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { kind, targetId } = parsed.data;
  const repo = parseRepo(parsed.data.repo);
  if (!repo) {
    return NextResponse.json({ error: "Paste a GitHub repository URL, like https://github.com/you/project." }, { status: 400 });
  }

  // Only for capstones and labs in modules the learner has open
  const moduleId =
    kind === "capstone"
      ? (await prisma.project.findFirst({ where: { id: targetId, archivedAt: null }, select: { moduleId: true } }))?.moduleId
      : (await prisma.lesson.findFirst({ where: { id: targetId, archivedAt: null }, select: { moduleId: true } }))?.moduleId;
  if (!moduleId || !(await getSequentialModuleUnlockMap(context.userId)).get(moduleId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const suite = await suiteFor(kind, targetId);
  if (!suite) return NextResponse.json({ error: "This has no GitHub tests yet." }, { status: 404 });

  const gh = await getRepo(repo);
  if (!gh.ok) return NextResponse.json({ error: gh.error }, { status: 400 });
  if (gh.data.private) {
    return NextResponse.json({ error: "Make the repository public so pylearn can check its runs." }, { status: 400 });
  }

  const link = await connectRepo(context.userId, kind, targetId, gh.data.full_name);
  return NextResponse.json(viewOf(link, suite.title));
});
