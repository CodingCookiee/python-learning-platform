import { normalizeEmail } from "@/lib/email-address";

/**
 * Whether signing in makes this account the first admin (ADMIN_BOOTSTRAP_EMAIL). Only the exact
 * address, only once it's verified, and only while no admin exists: after that, admins are made from
 * the Users page. A look-alike or an unverified sign-up can't claim the role (security review C-1).
 */
export function promotesToAdmin(
  user: { email: string | null; verified: boolean; role: string },
  site: { bootstrapEmail: string | undefined; adminExists: boolean }
): boolean {
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || !user.verified || site.adminExists) return false;
  if (!user.email || !site.bootstrapEmail) return false;
  return normalizeEmail(user.email) === normalizeEmail(site.bootstrapEmail);
}
