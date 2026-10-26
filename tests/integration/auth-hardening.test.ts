import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeToken, issueToken } from "@/lib/auth-tokens";
import { POST as resetPassword } from "@/app/api/auth/password/reset/route";
import { POST as register } from "@/app/api/auth/register/route";

// No call to the breached-password service from tests
process.env.PASSWORD_BREACH_CHECK = "off";

const run = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const made: string[] = [];

async function account(email: string) {
  const user = await prisma.user.create({
    data: { email, name: "Hardening", emailVerified: new Date(), password: await hash("an-old-password-1", 4) },
  });
  made.push(user.id);
  return user;
}

const post = (body: unknown) =>
  new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

afterAll(async () => {
  await prisma.user.deleteMany({ where: { OR: [{ id: { in: made } }, { email: { endsWith: `${run}@example.invalid` } }] } });
});

describe("an underscore in an email address is a character, not a wildcard", () => {
  let underscored: { id: string; email: string };
  let lookalike: { id: string; email: string };

  beforeAll(async () => {
    // In SQL ILIKE, "_" matches any one character: ann_lee would also have found annxlee
    lookalike = await account(`annxlee-${run}@example.invalid`);
    underscored = await account(`ann_lee-${run}@example.invalid`);
  });

  it("a reset link changes only the account it was sent to", async () => {
    const token = await issueToken("reset", underscored.email);
    const res = await resetPassword(post({ token, password: "a brand new passphrase" }));
    expect(res.status).toBe(200);

    const [mine, theirs] = await Promise.all(
      [underscored.id, lookalike.id].map((id) => prisma.user.findUniqueOrThrow({ where: { id }, select: { password: true } }))
    );
    expect(await compare("a brand new passphrase", mine!.password!)).toBe(true);
    expect(await compare("an-old-password-1", theirs!.password!)).toBe(true);
  });

  it("a reset ends every session signed in before it", async () => {
    const after = await prisma.user.findUniqueOrThrow({ where: { id: underscored.id }, select: { sessionVersion: true } });
    expect(after.sessionVersion).toBe(1);
    const untouched = await prisma.user.findUniqueOrThrow({ where: { id: lookalike.id }, select: { sessionVersion: true } });
    expect(untouched.sessionVersion).toBe(0);
  });

  it("signing up isn't refused because a different address matches the pattern", async () => {
    await account(`pzq-${run}@example.invalid`);
    const res = await register(post({ name: "Pat", email: `p_q-${run}@example.invalid`, password: "a long enough passphrase", confirmPassword: "a long enough passphrase" }));
    expect(res.status, await res.clone().text()).toBe(201);
  });

  it("signing up with a different-case copy of an existing address is still refused", async () => {
    const res = await register(post({ name: "Copy", email: `ANNXLEE-${run}@example.invalid`, password: "a long enough passphrase", confirmPassword: "a long enough passphrase" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("This email already has an account.");
  });
});

describe("an emailed link", () => {
  it("works once even when it's used twice at the same moment (security review L-5)", async () => {
    const user = await account(`twice-${run}@example.invalid`);
    const token = await issueToken("verify", user.email);
    const results = await Promise.all([consumeToken("verify", token), consumeToken("verify", token)]);
    expect(results.filter((email) => email === user.email)).toHaveLength(1);
  });
});
