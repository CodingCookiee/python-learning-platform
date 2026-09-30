/**
 * The site's public origin for links that leave the page: emailed links and lab
 * webhook URLs. Always configuration, never the request's Host header, so a forged
 * Host can't turn a reset email into a link to someone else's site.
 */
export function publicOrigin(): string {
  const configured = process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
