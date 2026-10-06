import type { Metadata } from "next";
import Link from "next/link";
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
  if (params.check) return "Check your inbox: we sent a link to confirm your email.";
  return null;
}

// Rendered on the server, so the page works (and reads) before any JavaScript arrives
export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const notice = noticeFor(await searchParams);
  return (
    <AuthShell title="Back to the mat." lede="Your belt, stripes and streak are where you left them.">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/auth/signup" className="font-medium text-primary underline">
              Create an account
            </Link>
          </p>
        </div>
        <SignInForm notice={notice} />
      </div>
    </AuthShell>
  );
}
