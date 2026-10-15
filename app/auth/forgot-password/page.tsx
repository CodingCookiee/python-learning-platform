import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/email-flows";

export const metadata: Metadata = {
  title: "Reset your forgotten password",
  description:
    "Forgot your pylearn password? Enter the email you sign in with and we'll send a link to choose a new one, so you can get back to training.",
  alternates: { canonical: "/auth/forgot-password" },
};

export default async function ForgotPasswordPage() {
  return (
    <AuthShell
      title="It happens."
      lede="We'll email you a link to choose a new password."
      heading="Forgot your password?"
      sub="Enter the email you sign in with."
      switchTo={{ prompt: "Remembered it?", label: "Sign in", href: "/auth/signin" }}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
