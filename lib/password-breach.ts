import { createHash } from "node:crypto";

/**
 * Has this password turned up in a public breach? Asks Have I Been Pwned's range API with
 * k-anonymity: only the first 5 characters of the password's SHA-1 leave the server, never the
 * password or its full hash, and the answer (every suffix sharing that prefix, padded) is matched
 * here. NIST SP 800-63B asks for exactly this check on any new password.
 *
 * It fails open: if the service is slow or down, sign-up and resets carry on (the local checks in
 * lib/validations/password.ts still apply). Off in tests, and with PASSWORD_BREACH_CHECK=off.
 */
export async function isBreachedPassword(password: string): Promise<boolean> {
  if (process.env.PASSWORD_BREACH_CHECK === "off" || process.env.VITEST) return false;
  const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "pylearn-password-check" },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = await res.text();
    for (const line of body.split("\n")) {
      const [hashSuffix, count] = line.trim().split(":");
      // Padding entries carry a count of 0
      if (hashSuffix === suffix && Number(count) > 0) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const BREACHED_MESSAGE =
  "That password has appeared in a data breach, so attackers try it first. Choose a different one.";
