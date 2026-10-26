/**
 * Sessions are 30-day JWTs, so a stolen session cookie would outlive a password change. Each account
 * has a sessionVersion; a session carries the value it signed in under, and a password change or
 * reset raises it, so every session from before stops working (security review M-2, OWASP Session
 * Management: renew or invalidate sessions after a credential change).
 *
 * Sessions issued before this existed carry no version and count as 0, the column's default.
 */
export function sessionIsCurrent(sessionVersion: number | undefined, accountVersion: number): boolean {
  return (sessionVersion ?? 0) === accountVersion;
}

/** The Prisma update that ends every session signed in before it */
export const END_OTHER_SESSIONS = { sessionVersion: { increment: 1 } } as const;
