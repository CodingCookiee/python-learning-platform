import type { Metadata } from "next";
import Link from "next/link";
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
    <AuthShell title="It happens." lede="We'll email you a link to choose a new password.">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Forgot your password?</h1>
          <p className="text-sm text-muted-foreground">Enter the email you sign in with.</p>
        </div>
        <ForgotPasswordForm />
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/signin" className="font-medium text-primary underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
