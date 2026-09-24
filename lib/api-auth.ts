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
    const sessionUserId = session?.user?.id;

    if (!sessionUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Confirm the user still exists (e.g. account deleted with a live token)
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
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
    select: { role: true },
  });

  return user?.role === "ADMIN";
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
