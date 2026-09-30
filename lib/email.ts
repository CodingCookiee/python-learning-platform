import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";
import { publicOrigin } from "@/lib/public-origin";
import { passwordResetEmail, verificationEmail } from "@/lib/email-templates";


type Provider = "gmail" | "resend" | null;

function provider(): Provider {
  const e = env();
  if (e.GMAIL_USER && e.GMAIL_APP_PASSWORD) return "gmail";
  if (e.RESEND_API_KEY && e.EMAIL_FROM) return "resend";
  return null;
}

export function isEmailConfigured(): boolean {
  return provider() !== null;
}

/** The From header: EMAIL_FROM if set, else "pylearn <gmail address>" (Gmail rewrites other senders anyway) */
function fromAddress(): string {
  const e = env();
  return e.EMAIL_FROM ?? `pylearn <${e.GMAIL_USER}>`;
}

let gmail: Transporter | null = null;
function gmailTransport(): Transporter {
  gmail ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    // App Passwords are shown with spaces; SMTP wants the 16 characters
    auth: { user: env().GMAIL_USER!, pass: env().GMAIL_APP_PASSWORD!.replace(/\s+/g, "") },
    connectionTimeout: 15_000,
    socketTimeout: 20_000,
  });
  return gmail;
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
  if (provider() === "gmail") {
    try {
      await gmailTransport().sendMail({ from: fromAddress(), to: email.to, subject: email.subject, text: email.text, html: email.html });
      return true;
    } catch (e) {
      console.error("[email] Gmail refused the message:", (e as Error).message);
      return false;
    }
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env().RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to: [email.to], subject: email.subject, text: email.text, html: email.html }),
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

export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  return sendEmail({ to, ...verificationEmail(`${publicOrigin()}/auth/verify-email?token=${encodeURIComponent(token)}`) });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  return sendEmail({ to, ...passwordResetEmail(`${publicOrigin()}/auth/reset-password?token=${encodeURIComponent(token)}`) });
}
