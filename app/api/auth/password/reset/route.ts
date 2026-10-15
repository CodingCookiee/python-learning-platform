import { NextResponse } from "next/server";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeToken, peekToken } from "@/lib/auth-tokens";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { newPasswordField, passwordProblem } from "@/lib/validations/password";
import { BREACHED_MESSAGE, isBreachedPassword } from "@/lib/password-breach";

const schema = z.object({
  token: z.string().min(10).max(200),
  password: newPasswordField,
});

/**
 * POST /api/auth/password/reset { token, password }
 * Set a new password from a reset link. The link works once. Resetting by email
 * also proves the address, so it marks the email verified. The new password follows the same
 * policy as sign-up (lib/validations/password.ts) and can't be the one it replaces.
 */
export async function POST(req: Request) {
  const limited = await rateLimit("passwordChange", `reset:${clientIp(req)}`);
  if (!limited.ok) return tooManyRequests(limited);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { password } = parsed.data;
  if (await isBreachedPassword(password)) {
    return NextResponse.json({ error: BREACHED_MESSAGE }, { status: 400 });
  }

  // Checked before the link is used up, so a refused password can be fixed and sent again
  const address = await peekToken("reset", parsed.data.token);
  const owner = address
    ? await prisma.user.findFirst({
        where: { email: { equals: address, mode: "insensitive" } },
        select: { password: true, email: true, name: true },
      })
    : null;
  if (owner) {
    const problem = passwordProblem(password, { email: owner.email, name: owner.name ?? undefined });
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    if (owner.password && (await compare(password, owner.password))) {
      return NextResponse.json(
        { error: "That's the password you have now. Choose a new one." },
        { status: 400 }
      );
    }
  }

  const email = await consumeToken("reset", parsed.data.token);
  if (!email) {
    return NextResponse.json({ error: "That reset link has expired or was already used. Ask for a new one." }, { status: 400 });
  }
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, emailVerified: true } });
  if (!user) return NextResponse.json({ error: "That account no longer exists." }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hash(password, 12), emailVerified: user.emailVerified ?? new Date() },
  });
  return NextResponse.json({ ok: true });
}
