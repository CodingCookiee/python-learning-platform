import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * API route authorization utilities
 */

/**
 * Wrapper for API routes that require authentication
 */
export function withAuth(
  handler: (req: NextRequest, context: { userId: string }) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user ID from database
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return handler(req, { userId: user.id });
  };
}

/**
 * Check if user has admin role
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const { prisma } = await import("@/lib/prisma");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  // For MVP, check if email matches admin list
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  return adminEmails.includes(user?.email || "");
}

/**
 * Wrapper for API routes that require admin role
 */
export function withAdmin(
  handler: (req: NextRequest, context: { userId: string }) => Promise<Response>
) {
  return withAuth(async (req: NextRequest, context: { userId: string }) => {
    const isUserAdmin = await isAdmin(context.userId);

    if (!isUserAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(req, context);
  });
}

/**
 * Rate limiting helper (simple in-memory implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Wrapper for API routes with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  limit: number = 10,
  windowMs: number = 60000
) {
  return async (req: NextRequest) => {
    const identifier = req.headers.get("x-forwarded-for") || "anonymous";

    if (!rateLimit(identifier, limit, windowMs)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    return handler(req);
  };
}
