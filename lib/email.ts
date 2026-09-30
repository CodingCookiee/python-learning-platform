import { env } from "@/lib/env";

/**
 * Transactional email through Resend (plain fetch). Without RESEND_API_KEY nothing
 * is sent: sign-ups are verified automatically, and in development the links are
 * printed to the server console so the flows can still be tried.
 */

/**
 * The origin used in emailed links. Always configuration, never the request's Host header,
 * so a forged Host can't turn a reset email into a link to someone else's site.
 */
function publicOrigin(): string {
  const configured = process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function isEmailConfigured(): boolean {
  return Boolean(env().RESEND_API_KEY && env().EMAIL_FROM);
}

interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(email: Email): Promise<boolean> {
  if (!isEmailConfigured()) {
    if (env().NODE_ENV === "development") console.info(`[email] (not sent) to ${email.to}: ${email.subject}\n${email.text}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env().RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env().EMAIL_FROM, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("[email] Resend refused the message:", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] Couldn't reach Resend:", (e as Error).message);
    return false;
  }
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A plain, readable email: a line of text, one button, and the link spelled out */
function layout(heading: string, body: string, action: { label: string; href: string }, footer: string) {
  const html = `<!doctype html><html><body style="margin:0;background:#f1f6f0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1d3b31">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:1px solid #d6e3d4;border-radius:6px"><tr><td style="padding:28px">
<p style="margin:0 0 20px;font-weight:800;font-size:18px">pylearn</p>
<h1 style="margin:0 0 12px;font-size:22px">${escape(heading)}</h1>
<p style="margin:0 0 24px;line-height:1.55">${escape(body)}</p>
<p style="margin:0 0 24px"><a href="${escape(action.href)}" style="display:inline-block;background:#1f7a57;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:4px;font-weight:600">${escape(action.label)}</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#5b7268">Or paste this link into your browser:</p>
<p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${escape(action.href)}" style="color:#1f7a57">${escape(action.href)}</a></p>
<p style="margin:0;font-size:13px;color:#5b7268">${escape(footer)}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${heading}\n\n${body}\n\n${action.label}: ${action.href}\n\n${footer}`;
  return { html, text };
}

export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const href = `${publicOrigin()}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const { html, text } = layout(
    "Confirm your email",
    "One click and your account is ready. Your white belt is waiting.",
    { label: "Confirm my email", href },
    "The link works for 24 hours. If you didn't sign up for pylearn, ignore this email."
  );
  return sendEmail({ to, subject: "Confirm your pylearn email", html, text });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  const href = `${publicOrigin()}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const { html, text } = layout(
    "Reset your password",
    "Someone (hopefully you) asked to reset the password for this pylearn account.",
    { label: "Choose a new password", href },
    "The link works for one hour and only once. If you didn't ask for this, ignore this email; your password hasn't changed."
  );
  return sendEmail({ to, subject: "Reset your pylearn password", html, text });
}
