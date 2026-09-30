import "dotenv/config";
import nodemailer from "nodemailer";
import { isEmailConfigured, sendEmail } from "../lib/email";

async function main() {
  console.log("configured:", isEmailConfigured());
  const t = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "") },
  });
  try {
    await t.verify();
    console.log("SMTP login: ok");
  } catch (e) {
    console.log("SMTP login failed:", (e as Error).message);
    return;
  }
  const sent = await sendEmail({
    to: process.env.GMAIL_USER!,
    subject: "pylearn email test",
    text: "If you can read this, pylearn can send verification and password-reset emails.",
    html: "<p>If you can read this, pylearn can send verification and password-reset emails.</p>",
  });
  console.log("test email sent:", sent);
}
main().finally(() => process.exit());
