import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueToken } from "@/lib/auth-tokens";
import { isEmailConfigured, sendVerificationEmail } from "@/lib/email";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email().max(320) });

/**
 * POST /api/auth/verify/resend { email }
 * Send a fresh confirmation link. The answer is the same whether or not the
 * address has an account, so this can't be used to find out who's signed up.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();

  for (const subject of [email, clientIp(req)]) {
    const limited = await rateLimit("emailSend", `verify-send:${subject}`);
    if (!limited.ok) return tooManyRequests(limited, "We've sent a few links already.");
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email isn't set up on this server yet." }, { status: 503 });
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { email: true, emailVerified: true },
  });
  if (user && !user.emailVerified) await sendVerificationEmail(user.email, await issueToken("verify", user.email));
  return NextResponse.json({ ok: true });
}
