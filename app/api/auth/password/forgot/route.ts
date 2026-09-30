import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueToken } from "@/lib/auth-tokens";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/auth/password/forgot { email }
 * Email a reset link to accounts that have a password. The same answer comes
 * back either way, so this can't be used to find out who's signed up.
 */
export async function POST(req: Request) {
  const parsed = forgotPasswordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();

  for (const subject of [email, clientIp(req)]) {
    const limited = await rateLimit("emailSend", `reset-send:${subject}`);
    if (!limited.ok) return tooManyRequests(limited, "We've sent a few links already.");
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Password reset by email isn't set up on this server yet. Ask the admin to reset it." },
      { status: 503 }
    );
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { email: true, password: true },
  });
  // Accounts that only use GitHub or Google have no password to reset
  if (user?.password) await sendPasswordResetEmail(user.email, await issueToken("reset", user.email));
  return NextResponse.json({ ok: true });
}
