import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/lib/email-address";

/**
 * Addresses a super admin removed and barred from signing up again. Only a keyed fingerprint
 * (HMAC-SHA256 of the normalised address) is kept, never the address: it can tell "this one is
 * blocked" when someone tries it, but a leak of the table gives no list of emails. Someone who
 * deletes their own account is never blocked; they can come back with a fresh one.
 *
 * The key is derived from AUTH_SECRET, so rotating that secret lifts every block.
 */
function fingerprint(email: string): string {
  return createHmac("sha256", env().AUTH_SECRET)
    .update(`blocked-email:${normalizeEmail(email)}`)
    .digest("hex");
}

export async function isEmailBlocked(email: string): Promise<boolean> {
  const row = await prisma.blockedEmail.findUnique({
    where: { hash: fingerprint(email) },
    select: { hash: true },
  });
  return row !== null;
}

export async function blockEmail(email: string, blockedById: string): Promise<void> {
  const hash = fingerprint(email);
  await prisma.blockedEmail.upsert({
    where: { hash },
    update: {},
    create: { hash, blockedById },
  });
}

/** Lifts a block; false when the address wasn't blocked */
export async function unblockEmail(email: string): Promise<boolean> {
  const { count } = await prisma.blockedEmail.deleteMany({ where: { hash: fingerprint(email) } });
  return count > 0;
}

export const BLOCKED_MESSAGE =
  "This email address can't be used to create an account. If you think that's a mistake, get in touch through the contact page.";
