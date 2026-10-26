import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { z } from "zod";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { newPasswordField, passwordProblem } from "@/lib/validations/password";
import { BREACHED_MESSAGE, isBreachedPassword } from "@/lib/password-breach";
import { END_OTHER_SESSIONS } from "@/lib/session-version";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: newPasswordField,
});

export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const limited = await rateLimit("passwordChange", context.userId);
    if (!limited.ok) return tooManyRequests(limited, "Too many password attempts.");
    const body = (await req.json()) as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { currentPassword, newPassword } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { password: true, email: true, name: true },
    });
    if (!user?.password) {
      return NextResponse.json(
        { error: "No password set. Use OAuth to sign in." },
        { status: 400 }
      );
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    const problem = passwordProblem(newPassword, { email: user.email, name: user.name ?? undefined });
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    if (await bcrypt.compare(newPassword, user.password)) {
      return NextResponse.json(
        { error: "That's the password you have now. Choose a new one." },
        { status: 400 }
      );
    }
    if (await isBreachedPassword(newPassword)) {
      return NextResponse.json({ error: BREACHED_MESSAGE }, { status: 400 });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    // Every other session ends with the old password, and so does this one: the settings page signs
    // straight back in with the new password (lib/session-version.ts)
    await prisma.user.update({ where: { id: context.userId }, data: { password: hashed, ...END_OTHER_SESSIONS } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
});
