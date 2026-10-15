/**
 * Email addresses are compared and stored lower-cased and trimmed. Postgres compares text
 * case-sensitively, so without this "Ada@x.io" and "ada@x.io" would be two accounts, and anything
 * that matched emails loosely (the bootstrap admin, verification) could be claimed by a look-alike.
 * Security review 2026-10-14, C-1.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
