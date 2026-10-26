import { describe, expect, it } from "vitest";
import { addressProven } from "@/lib/admin/bootstrap";
import { sessionIsCurrent } from "@/lib/session-version";
import { clientIp, LIMITS, limitReached, rateLimit } from "@/lib/rate-limit";

describe("the bootstrap admin's address must be proven (security review C-1, N3)", () => {
  it("counts a link-confirmed address, or one from Google or GitHub", () => {
    expect(addressProven({ emailVerified: true, oauthLinked: false }, true)).toBe(true);
    expect(addressProven({ emailVerified: true, oauthLinked: true }, false)).toBe(true);
  });

  it("doesn't count a sign-up verified only because email isn't set up", () => {
    expect(addressProven({ emailVerified: true, oauthLinked: false }, false)).toBe(false);
    expect(addressProven({ emailVerified: false, oauthLinked: true }, true)).toBe(false);
  });
});

describe("sessions from before a password change (security review M-2)", () => {
  it("are current only at the account's version", () => {
    expect(sessionIsCurrent(2, 2)).toBe(true);
    expect(sessionIsCurrent(1, 2)).toBe(false);
  });

  it("count a session from before versions existed as version 0", () => {
    expect(sessionIsCurrent(undefined, 0)).toBe(true);
    expect(sessionIsCurrent(undefined, 1)).toBe(false);
  });
});

describe("the client IP for rate limits (security review M-1)", () => {
  const req = (headers: Record<string, string>) => new Request("https://pylearn.example/api", { headers });

  it("trusts the platform's x-real-ip over a client-supplied X-Forwarded-For", () => {
    expect(clientIp(req({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("falls back to the first forwarded address, then to unknown", () => {
    expect(clientIp(req({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("198.51.100.1");
    expect(clientIp(req({}))).toBe("unknown");
  });
});

describe("the per-IP sign-in limit counts only failures (OWASP)", () => {
  it("isn't reached by checking, only by failed attempts", async () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 250)}-${Date.now()}`;
    for (let i = 0; i < 5; i++) expect(await limitReached("signInIp", ip)).toBe(false);
    for (let i = 0; i < LIMITS.signInIp.limit - 1; i++) await rateLimit("signInIp", ip);
    expect(await limitReached("signInIp", ip)).toBe(false);
    await rateLimit("signInIp", ip);
    expect(await limitReached("signInIp", ip)).toBe(true);
    expect(await limitReached("signInIp", `${ip}-other`)).toBe(false);
  });
});
