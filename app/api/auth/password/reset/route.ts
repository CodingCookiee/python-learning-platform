import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/auth-tokens";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

/**
 * POST /api/auth/password/reset { token, password }
 * Set a new password from a reset link. The link works once. Resetting by email
 * also proves the address, so it marks the email verified.
 */
export async function POST(req: Request) {
  const limited = await rateLimit("passwordChange", `reset:${clientIp(req)}`);
  if (!limited.ok) return tooManyRequests(limited);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const email = await consumeToken("reset", parsed.data.token);
  if (!email) {
    return NextResponse.json({ error: "That reset link has expired or was already used. Ask for a new one." }, { status: 400 });
  }
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, emailVerified: true } });
  if (!user) return NextResponse.json({ error: "That account no longer exists." }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hash(parsed.data.password, 12), emailVerified: user.emailVerified ?? new Date() },
  });
  return NextResponse.json({ ok: true });
}
