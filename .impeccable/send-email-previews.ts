import "dotenv/config";
import { sendEmail } from "../lib/email";
import { passwordResetEmail, verificationEmail } from "../lib/email-templates";

// Sends one preview of each template to GMAIL_USER (your own inbox); the links are dummies
async function main() {
  const to = process.env.GMAIL_USER!;
  for (const e of [
    verificationEmail("http://localhost:3000/auth/verify-email?token=preview-only"),
    passwordResetEmail("http://localhost:3000/auth/reset-password?token=preview-only"),
  ]) {
    console.log(e.subject, "→", await sendEmail({ to, ...e, subject: `[Preview] ${e.subject}` }));
  }
}
main().finally(() => process.exit());
