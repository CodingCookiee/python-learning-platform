import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storeReport } from "@/lib/ci/links";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  repository: z.string().max(200),
  runId: z.string().regex(/^\d{1,20}$/),
  sha: z.string().regex(/^[0-9a-f]{7,64}$/i),
  // Sent by older workflow files; ignored, the link is rebuilt from the connected repo
  runUrl: z.string().max(400).optional(),
  tests: z
    .array(
      z.object({
        name: z.string().max(300),
        file: z.string().max(300).optional(),
        outcome: z.enum(["passed", "failed", "skipped"]),
        message: z.string().max(600).optional(),
      })
    )
    .max(300),
});

/**
 * POST /api/ci/report/[token]
 * Test results from a learner's pylearn workflow. They're shown straight away but
 * only count once GitHub's API confirms the run (see verifyLink in lib/ci/links.ts).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{10,64}$/.test(token)) return NextResponse.json({ error: "Unknown token" }, { status: 404 });
  const limited = await rateLimit("labVerify", `report:${token}`);
  if (!limited.ok) return tooManyRequests(limited);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  const { repository, runId, sha, tests } = parsed.data;
  const link = await storeReport(token, { repository, runId, sha, tests });
  if (!link) return NextResponse.json({ error: "Unknown token. Copy the workflow file from pylearn again." }, { status: 404 });
  const failed = parsed.data.tests.filter((t) => t.outcome === "failed").length;
  return NextResponse.json({
    ok: true,
    message: failed
      ? `pylearn has the results: ${failed} test(s) failed. Open the page to see which.`
      : "pylearn has the results. They count once GitHub confirms the run.",
  });
}
