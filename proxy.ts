import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Proxy for route protection and authentication.
 * Runs on every request to protected routes.
 */
export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  });
  const isAuthenticated = !!token;
  const pathname = req.nextUrl.pathname;

  // API routes that require authentication
  // (API handlers also enforce auth themselves via withAuth)
  const protectedApiRoutes = ["/api/progress", "/api/exercises", "/api/profile", "/api/settings"];
  const isProtectedApi = protectedApiRoutes.some((route) => pathname.startsWith(route));

  // Protected app routes
  const protectedRoutes = [
    "/dashboard",
    "/modules",
    "/lessons",
    "/exercises",
    "/projects",
    "/achievements",
    "/profile",
    "/settings",
  ];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isAuthenticated && isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect unauthenticated users to sign in
  if (!isAuthenticated && isProtectedRoute) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from auth pages
  if (
    isAuthenticated &&
    (pathname === "/" || pathname.startsWith("/auth/signin") || pathname.startsWith("/auth/signup"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Admin route protection (optimistic; pages re-check with isAdmin)
  if (isAuthenticated && pathname.startsWith("/admin") && token?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Unauthenticated users trying to access admin get sent to sign-in
  if (!isAuthenticated && pathname.startsWith("/admin")) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

// Configure which routes the proxy runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
