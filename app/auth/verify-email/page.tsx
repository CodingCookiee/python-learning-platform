import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailForm } from "@/components/auth/email-flows";

// Reached only from an emailed link (robots.txt keeps it out of search), so a title is all it needs
export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false },
};

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell
      title="One last step."
      lede="Confirm your email and your white belt is ready."
      switchTo={{ label: "Sign in", href: "/auth/signin" }}
    >
      <VerifyEmailForm token={token} />
    </AuthShell>
  );
}
