import { NextRequest, NextResponse } from "next/server";
import { checkFields, parseLab, recordLabCheck, runForToken } from "@/lib/labs";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const MAX_BODY = 64_000;

/**
 * POST /api/labs/hook/[token]
 * A learner's personal lab URL. Their n8n workflow, scheduled job or script POSTs
 * JSON here; the body is checked against the lab's expected fields and the answer
 * says what matched, so it's useful from curl or an n8n execution log too.
 * No session: the unguessable token is the credential.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const run = await runForToken(token);
  const spec = run && !run.lesson.archivedAt ? parseLab(run.lesson.lab) : null;
  if (!run || !spec || spec.kind !== "webhook") {
    return NextResponse.json({ ok: false, error: "Unknown lab URL. Copy it again from the lesson page." }, { status: 404 });
  }
  const limited = await rateLimit("labVerify", token);
  if (!limited.ok) return tooManyRequests(limited, "That's a lot of lab requests.");

  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ ok: false, error: "The body is over 64 KB." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    const check = { passed: false, notes: ["✗ The body isn't JSON. Send Content-Type: application/json with a JSON object."] };
    await recordLabCheck(run.id, run.userId, check, text);
    return NextResponse.json({ ok: false, verified: false, notes: check.notes }, { status: 400 });
  }

  const check = checkFields(spec, body);
  const { newlyVerified } = await recordLabCheck(run.id, run.userId, check, JSON.stringify(body, null, 2));
  return NextResponse.json({
    ok: true,
    verified: check.passed,
    newlyVerified,
    notes: check.notes,
    message: check.passed ? "Lab verified. Head back to the lesson." : "Received, but not everything matched yet.",
  });
}
