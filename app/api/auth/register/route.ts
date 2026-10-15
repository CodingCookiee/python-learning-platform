import { NextResponse } from "next/server";
import { notifySignup } from "@/lib/admin/notifications";
import { hash } from "bcryptjs";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validations/auth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isEmailConfigured, sendVerificationEmail } from "@/lib/email";
import { issueToken } from "@/lib/auth-tokens";
import { BREACHED_MESSAGE, isBreachedPassword } from "@/lib/password-breach";
import { BLOCKED_MESSAGE, isEmailBlocked } from "@/lib/admin/blocked-emails";

export async function POST(req: Request) {
  try {
    const limited = await rateLimit("register", clientIp(req));
    if (!limited.ok) return tooManyRequests(limited, "Too many sign-ups from here.");
    const body = await req.json();
    const validatedData = signUpSchema.parse(body);
    if (await isBreachedPassword(validatedData.password)) {
      return NextResponse.json({ error: BREACHED_MESSAGE, field: "password" }, { status: 400 });
    }

    // An address a super admin removed and barred
    if (await isEmailBlocked(validatedData.email)) {
      return NextResponse.json({ error: BLOCKED_MESSAGE, field: "email" }, { status: 403 });
    }

    // Check if user already exists
    // Case-insensitive, so a look-alike of an existing address (or of the admin's) can't register
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: validatedData.email, mode: "insensitive" } },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: "This email already has an account.", field: "email" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        // With email set up, the address is confirmed by link; without it there's no way to, so trust it
        emailVerified: isEmailConfigured() ? null : new Date(),
      },
    });

    // Create streak record
    await prisma.streak.create({
      data: {
        userId: user.id,
        currentStreak: 0,
        longestStreak: 0,
      },
    });

    await notifySignup(user, "email sign-up");

    const needsVerification = isEmailConfigured();
    if (needsVerification) await sendVerificationEmail(user.email, await issueToken("verify", user.email));

    return NextResponse.json(
      {
        needsVerification,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Registration error:", error);

    if (error instanceof ZodError) {
      // The first problem, in the form's own words (the browser runs the same checks first)
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Check the form and try again.",
          // The form shows it under the field it's about
          field: error.issues[0]?.path[0],
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
