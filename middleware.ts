import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Middleware for route protection and authentication
 * Runs on every request to protected routes
 */

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const pathname = req.nextUrl.pathname;

  // API routes that require authentication
  const protectedApiRoutes = ["/api/progress", "/api/exercises/submit", "/api/user"];
  const isProtectedApi = protectedApiRoutes.some((route) => pathname.startsWith(route));

  // Protected app routes
  const protectedRoutes = ["/dashboard", "/modules", "/lessons", "/profile"];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users to sign in
  if (!isAuthenticated && (isProtectedRoute || isProtectedApi)) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && pathname.startsWith("/auth/signin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

// Configure which routes the middleware runs on
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
