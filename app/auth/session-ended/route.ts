import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /auth/session-ended
 * A session cookie whose account no longer exists (deleted, or a reset database). The proxy reads the
 * cookie as signed in and sends /auth/signin on to the dashboard; the pages find no such user and send
 * it back to sign-in: a redirect loop. Pages that find no user come here instead, which clears the
 * session cookie (a route handler can; a page can't) and then shows sign-in.
 */
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/auth/signin", req.url));
  for (const cookie of req.cookies.getAll()) {
    // Auth.js's session cookie, chunked (.0, .1) when large, with the __Secure- prefix over https
    if (cookie.name.includes("authjs.session-token")) {
      res.cookies.set(cookie.name, "", {
        maxAge: 0,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: cookie.name.startsWith("__Secure-"),
      });
    }
  }
  return res;
}
