import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { suiteFor, suitePayload, type CiKind } from "@/lib/ci/links";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * GET /api/ci/suite/[token]
 * The tests a learner's pylearn workflow runs, with the files that run and report
 * them. Called from GitHub Actions; the token in the workflow is the credential.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{10,64}$/.test(token)) return NextResponse.json({ error: "Unknown token" }, { status: 404 });
  const limited = await rateLimit("labVerify", `suite:${token}`);
  if (!limited.ok) return tooManyRequests(limited);
  const link = await prisma.ciLink.findUnique({ where: { token } });
  const suite = link ? await suiteFor(link.kind as CiKind, link.targetId) : null;
  if (!suite) return NextResponse.json({ error: "Unknown token. Copy the workflow file from pylearn again." }, { status: 404 });
  return NextResponse.json(suitePayload(suite));
}
