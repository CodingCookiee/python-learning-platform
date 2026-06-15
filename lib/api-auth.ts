import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * API route authorization utilities
 */

/**
 * Route context type that supports optional dynamic route params.
 * Next.js App Router passes params as the second argument to route handlers.
 */
export type AuthContext<TParams extends Record<string, string> = Record<string, never>> = {
  userId: string;
  params: Promise<TParams>;
};

/**
 * Wrapper for API routes that require authentication.
 * Supports dynamic route segments by forwarding Next.js route params to the handler.
 */
export function withAuth<TParams extends Record<string, string> = Record<string, never>>(
  handler: (req: NextRequest, context: AuthContext<TParams>) => Promise<Response>
) {
  return async (req: NextRequest, routeContext?: { params: Promise<TParams> }) => {
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

    // Provide an empty resolved params promise when there are no route params
    const params = routeContext?.params ?? (Promise.resolve({}) as Promise<TParams>);

    return handler(req, { userId: user.id, params });
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
export function withAdmin<TParams extends Record<string, string> = Record<string, never>>(
  handler: (req: NextRequest, context: AuthContext<TParams>) => Promise<Response>
) {
  return withAuth<TParams>(async (req: NextRequest, context: AuthContext<TParams>) => {
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
