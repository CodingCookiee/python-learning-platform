import { NextRequest, NextResponse } from "next/server";
import { adminLevel } from "@/lib/admin/levels";
import { auth } from "@/auth";
import { sessionIsCurrent } from "@/lib/session-version";

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
      select: { id: true, suspendedAt: true, sessionVersion: true },
    });

    // A valid token for an account that no longer exists is not a session, and nor is one signed in
    // before the password last changed (lib/session-version.ts)
    if (!user || !sessionIsCurrent(session.user.sessionVersion, user.sessionVersion)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Suspended by an admin: the session stays, but nothing works until it's lifted
    if (user.suspendedAt) {
      return NextResponse.json({ error: "This account is suspended." }, { status: 403 });
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

  // Either level: both may review submissions and see the overview
  return adminLevel(user?.role) !== null;
}

/** Full control: accounts, progress, certificates, content, the audit log */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return adminLevel(user?.role) === "super";
}

/** Wrapper for API routes only a super admin may use */
export function withSuperAdmin<TParams extends Record<string, string> = Record<string, never>>(
  handler: (req: NextRequest, context: AuthContext<TParams>) => Promise<Response>
) {
  return withAuth<TParams>(async (req: NextRequest, context: AuthContext<TParams>) => {
    if (!(await isSuperAdmin(context.userId))) {
      return NextResponse.json({ error: "Only a super admin can do that." }, { status: 403 });
    }
    return handler(req, context);
  });
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
