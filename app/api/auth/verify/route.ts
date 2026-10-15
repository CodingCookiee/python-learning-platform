import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/auth-tokens";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({ token: z.string().min(10).max(200) });

/**
 * POST /api/auth/verify { token }
 * Confirm an email address. A POST from the confirm button, not a GET on the
 * link, so mail scanners that open links can't use the token up.
 */
export async function POST(req: Request) {
  const limited = await rateLimit("emailSend", `verify:${clientIp(req)}`);
  if (!limited.ok) return tooManyRequests(limited);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That link isn't valid." }, { status: 400 });

  const email = await consumeToken("verify", parsed.data.token);
  if (!email) {
    return NextResponse.json({ error: "That link has expired or was already used. Sign in to get a new one." }, { status: 400 });
  }
  // The exact address the link was sent to: a case-insensitive match would also verify look-alike accounts
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
  // A link that outlived its account (deleted since it was sent) confirms nothing
  if (!user) {
    return NextResponse.json(
      { error: "There's no account for this link any more. If you'd like one, sign up again." },
      { status: 410 }
    );
  }
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  return NextResponse.json({ ok: true, alreadyVerified: false });
}
