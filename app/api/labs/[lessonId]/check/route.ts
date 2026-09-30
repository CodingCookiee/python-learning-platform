import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { checkOutput, ensureLabRun, getLabForUser, probeUrl, recordLabCheck } from "@/lib/labs";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  url: z.string().trim().max(2_000).optional(),
  output: z.string().max(20_000).optional(),
});

/**
 * POST /api/labs/[lessonId]/check { url } | { output }
 * Check a url lab (probe the learner's deployment) or an output lab (match the
 * pasted output). Webhook labs are checked when the request arrives instead.
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext<{ lessonId: string }>) => {
  const { lessonId } = await context.params;
  const limited = await rateLimit("labVerify", context.userId);
  if (!limited.ok) return tooManyRequests(limited, "That's a lot of lab checks.");

  const lab = await getLabForUser(context.userId, lessonId);
  if (!lab) return NextResponse.json({ error: "This lesson has no lab" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  let check;
  let payload: string;
  if (lab.spec.kind === "url") {
    if (!parsed.data.url) return NextResponse.json({ error: "Enter your deployed URL." }, { status: 400 });
    ({ check, payload } = await probeUrl(lab.spec, parsed.data.url));
  } else if (lab.spec.kind === "output") {
    if (!parsed.data.output?.trim()) return NextResponse.json({ error: "Paste the command's output." }, { status: 400 });
    payload = parsed.data.output;
    check = checkOutput(lab.spec, payload);
  } else {
    return NextResponse.json({ error: "This lab is checked when your workflow calls its URL." }, { status: 400 });
  }

  const run = await ensureLabRun(context.userId, lessonId);
  const { newlyVerified } = await recordLabCheck(run.id, context.userId, check, payload);
  return NextResponse.json({ ...(await getLabForUser(context.userId, lessonId)), newlyVerified });
});
