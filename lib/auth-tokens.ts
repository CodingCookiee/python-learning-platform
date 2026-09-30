import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * One-time tokens for email verification and password reset, in Auth.js's
 * VerificationToken table. Only a SHA-256 hash is stored, so a database leak
 * doesn't hand out working links. Issuing a new token voids the older ones.
 */

export type TokenKind = "verify" | "reset";

const TTL_MS: Record<TokenKind, number> = {
  verify: 24 * 60 * 60 * 1000,
  reset: 60 * 60 * 1000,
};

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const identifier = (kind: TokenKind, email: string) => `${kind}:${email.trim().toLowerCase()}`;

export async function issueToken(kind: TokenKind, email: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const id = identifier(kind, email);
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: id } }),
    prisma.verificationToken.create({ data: { identifier: id, token: hash(token), expires: new Date(Date.now() + TTL_MS[kind]) } }),
  ]);
  return token;
}

/** The email a valid token was issued for, or null. The token is used up either way. */
export async function consumeToken(kind: TokenKind, token: string): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const row = await prisma.verificationToken.findUnique({ where: { token: hash(token) } });
  if (!row || !row.identifier.startsWith(`${kind}:`)) return null;
  await prisma.verificationToken.deleteMany({ where: { token: row.token } });
  if (row.expires.getTime() < Date.now()) return null;
  return row.identifier.slice(kind.length + 1);
}
