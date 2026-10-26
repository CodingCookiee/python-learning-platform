import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthShell, FormError } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

// Auth.js sends a sign-in it refuses here (pages.error in auth.config.ts), so a title is all it needs
export const metadata: Metadata = {
  title: "Couldn't sign you in",
  robots: { index: false },
};

/** Auth.js's error codes, in words a learner can act on */
function messageFor(error: string | undefined): string {
  switch (error) {
    // Our signIn callback said no: an unverified Google or GitHub address, or GitHub didn't answer
    case "AccessDenied":
      return "That sign-in wasn't accepted. With GitHub or Google, the account's email address has to be verified there first. Verify it, or sign in with your email and password, and try again.";
    case "Verification":
      return "That sign-in link has expired or was already used. Ask for a new one.";
    case "OAuthAccountNotLinked":
      return "This email already has a pylearn account. Sign in the way you did before.";
    case "Configuration":
      return "Sign-in isn't working on our side right now. Try again in a few minutes.";
    default:
      return "Something went wrong while signing you in. Try again.";
  }
}

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthShell
      title="Off the mat for a moment."
      lede="Your belt, stripes and streak are safe. Only the sign-in didn't go through."
      heading="Couldn't sign you in"
      switchTo={{ prompt: "New here?", label: "Create an account", href: "/auth/signup" }}
    >
      <div className="flex flex-col gap-6">
        <FormError message={messageFor(error)} />
        <Button asChild size="lg" className="w-full">
          <Link href="/auth/signin">
            Back to sign in
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </AuthShell>
  );
}
