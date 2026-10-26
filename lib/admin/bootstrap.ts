import { normalizeEmail } from "@/lib/email-address";

/**
 * Whether signing in makes this account the first admin (ADMIN_BOOTSTRAP_EMAIL). Only the exact
 * address, only once it's verified, and only while no admin exists: after that, admins are made from
 * the Users page. A look-alike or an unverified sign-up can't claim the role (security review C-1).
 */
/**
 * Whether the account has really proven it owns its address: confirmed by an emailed link, or signed
 * in with Google or GitHub (which only pass verified addresses). Without email set up, sign-ups are
 * marked verified with no proof at all, so whoever registered the bootstrap address first would win.
 */
export function addressProven(user: { emailVerified: boolean; oauthLinked: boolean }, emailConfigured: boolean): boolean {
  return user.emailVerified && (emailConfigured || user.oauthLinked);
}

export function promotesToAdmin(
  user: { email: string | null; verified: boolean; role: string },
  site: { bootstrapEmail: string | undefined; adminExists: boolean }
): boolean {
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || !user.verified || site.adminExists) return false;
  if (!user.email || !site.bootstrapEmail) return false;
  return normalizeEmail(user.email) === normalizeEmail(site.bootstrapEmail);
}
