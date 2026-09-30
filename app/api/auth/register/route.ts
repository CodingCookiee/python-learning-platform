import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validations/auth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isEmailConfigured, sendVerificationEmail } from "@/lib/email";
import { issueToken } from "@/lib/auth-tokens";

export async function POST(req: Request) {
  try {
    const limited = await rateLimit("register", clientIp(req));
    if (!limited.ok) return tooManyRequests(limited, "Too many sign-ups from here.");
    const body = await req.json();
    const validatedData = signUpSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
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
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
