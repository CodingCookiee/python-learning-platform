import { BLOCKED_MESSAGE } from "@/lib/admin/blocked-emails";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasCredentialsInQuery } from "@/lib/strip-credentials";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "./_components/signin-form";

export const metadata: Metadata = {
  title: "Sign in to your Python training",
  description:
    "Sign in to pylearn and pick up your Python training where you left it: your belt, stripes, streak, drills and the next lesson.",
  alternates: { canonical: "/auth/signin" },
};

/** Where the sign-in page was sent from: a confirmed email, a reset password, or a sign-up */
function noticeFor(params: Record<string, string | string[] | undefined>): string | null {
  if (params.verified) return "Email confirmed. Sign in to start training.";
  if (params.reset) return "Password changed. Sign in with the new one.";
  // A session from before a password change, here or on another device (lib/session-version.ts)
  if (params.signedout) return "Your password was changed, so you were signed out here. Sign in with the new one.";
  if (params.check) return "Check your inbox: we sent a link to confirm your email.";
  return null;
}

/** Not good news: shown as an error rather than a notice */
function alertFor(params: Record<string, string | string[] | undefined>): string | null {
  if (params.suspended) return "This account is suspended. If you think that's a mistake, contact pylearn.";
  if (params.blocked) return BLOCKED_MESSAGE;
  return null;
}

// Rendered on the server, so the page works (and reads) before any JavaScript arrives
export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  // Credentials in the address (an old GET submit): drop them before anything else
  if (hasCredentialsInQuery(params)) redirect("/auth/signin");
  const notice = noticeFor(params);
  const alert = alertFor(params);
  return (
    <AuthShell
      title="Back to the mat."
      lede="Your belt, stripes and streak are where you left them."
      heading="Sign in"
      sub="Pick up your training where you stopped."
      switchTo={{ prompt: "New here?", label: "Create an account", href: "/auth/signup" }}
    >
      <SignInForm notice={notice} alert={alert} />
    </AuthShell>
  );
}
