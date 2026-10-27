/**
 * The requests Vercel BotID checks: making an account, signing in with a password, and the two that send
 * email. Browser-safe: instrumentation-client.ts signs these, and lib/bot-check.ts verifies the signature
 * in each route. A route added here needs looksAutomated() on the server too.
 */
/** What a refused request says: the routes' error, and the sign-in form's for Auth.js's "automated" code */
export const BOT_MESSAGE =
  "We couldn't tell this came from a person using the page. Reload the page and try again. If it keeps happening, contact pylearn.";

export const BOT_CHECKED = [
  { path: "/api/auth/register", method: "POST" },
  // Auth.js's credentials sign-in (authorize() in auth.config.ts)
  { path: "/api/auth/callback/credentials", method: "POST" },
  { path: "/api/auth/password/forgot", method: "POST" },
  { path: "/api/auth/verify/resend", method: "POST" },
];
