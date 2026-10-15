import { z } from "zod";

/**
 * pylearn's password policy, after NIST SP 800-63B and OWASP ASVS: length over composition. A new
 * password is 8 to 64 characters, any characters at all (spaces and emoji included), with no rules
 * about mixing cases or symbols. Instead it may not be a commonly used or already-breached
 * password, a run like "aaaaaaaa" or "12345678", or built from the account's own email or name.
 *
 * The checks that need no network run in the browser too, as the learner types; the breach check
 * (lib/password-breach.ts) runs on the server only.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
/** bcrypt reads only the first 72 bytes; past that, two different passwords would hash the same */
const BCRYPT_BYTES = 72;

/** The rule as the forms state it, before anyone types */
export const PASSWORD_RULE = `At least ${PASSWORD_MIN} characters. A short phrase is easier to remember and harder to guess.`;

/** The most used passwords (every breach list's top entries) and the site's own name */
const COMMON = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "p@ssw0rd", "p@ssword",
  "12345678", "123456789", "1234567890", "0123456789", "87654321", "11111111", "00000000",
  "qwertyui", "qwertyuiop", "qwerty123", "qwerty12", "1q2w3e4r", "1q2w3e4r5t", "1qaz2wsx",
  "zaq12wsx", "asdfghjk", "asdfghjkl", "zxcvbnm1", "iloveyou", "iloveyou1", "sunshine",
  "princess", "football", "baseball", "superman", "starwars", "whatever", "trustno1",
  "letmein1", "welcome1", "welcome123", "monkey123", "dragon123", "master123", "admin123",
  "administrator", "changeme", "default1", "secret123", "abc12345", "abcd1234", "aa123456",
  "computer", "internet", "michelle", "jennifer", "shadow12", "charlie1", "liverpool",
  "chelsea1", "arsenal1", "pakistan", "pakistan123", "india123", "freedom1", "lovely123",
  "babygirl", "jordan23", "mustang1", "batman123", "pokemon1", "minecraft", "football1",
  "pylearn", "pylearn1", "pylearn123", "python123", "python12", "pythonista", "learnpython",
]);

/** Keyboard and alphabet runs, forwards; a password inside one (either way round) is a run */
const RUNS = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

function isRun(lower: string): boolean {
  if (/^(.)\1+$/u.test(lower)) return true;
  // "abab…", "123123…": one short chunk repeated
  if (/^(.{1,4})\1+$/u.test(lower)) return true;
  return RUNS.some((run) => run.includes(lower) || [...run].reverse().join("").includes(lower));
}

/** The words the account itself gives away: the email's name part and each part of the name */
function personalWords(context: { email?: string; name?: string }): string[] {
  const words: string[] = [];
  const local = context.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4) words.push(local);
  for (const part of (context.name ?? "").toLowerCase().split(/\s+/)) {
    if (part.length >= 4) words.push(part);
  }
  return words;
}

/**
 * Why a new password isn't allowed, in the learner's terms, or null if it's fine. No network:
 * safe in the browser. The server adds the breach check on top.
 */
export function passwordProblem(
  password: string,
  context: { email?: string; name?: string } = {}
): string | null {
  if (password.trim().length === 0) return "Choose a password.";
  if ([...password].length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if ([...password].length > PASSWORD_MAX) return `Keep it to ${PASSWORD_MAX} characters or fewer.`;
  if (new TextEncoder().encode(password).length > BCRYPT_BYTES)
    return "That's too long once encoded; use fewer special characters or emoji.";

  const lower = password.toLowerCase();
  // Strip the usual trailing decoration ("password!", "password2026") before comparing
  const core = lower.replace(/[\d\W_]+$/u, "");
  if (COMMON.has(lower) || (core.length >= 4 && COMMON.has(core)))
    return "That's one of the most used passwords. Pick something less common.";
  if (isRun(lower)) return "That's a simple run of characters. Pick something less predictable.";
  for (const word of personalWords(context)) {
    if (lower.includes(word)) return "Don't build it from your email or name.";
  }
  return null;
}

/** A new password's field: required, and within the length limits (the rest is checked with context) */
export const newPasswordField = z
  .string()
  .min(1, "Choose a password.")
  .superRefine((value, ctx) => {
    const problem = passwordProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

/** Checks the personal-word rule once the email and name are known (sign-up) */
export function refineAgainstAccount<T extends { password: string; email?: string; name?: string }>(
  data: T,
  ctx: z.RefinementCtx
) {
  const problem = passwordProblem(data.password, { email: data.email, name: data.name });
  if (problem) ctx.addIssue({ code: "custom", message: problem, path: ["password"] });
}
