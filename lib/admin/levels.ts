/**
 * Two admin levels. A super admin has full control: accounts, progress, certificates, content, the
 * audit log. An admin reviews capstone submissions and sees the overview, read-only. Browser-safe.
 */
export type AdminLevel = "admin" | "super";

/** Roles that may enter the admin area at all */
export const STAFF_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export function adminLevel(role: string | null | undefined): AdminLevel | null {
  return role === "SUPER_ADMIN" ? "super" : role === "ADMIN" ? "admin" : null;
}

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  AUTHOR: "Author",
  LEARNER: "Learner",
};
