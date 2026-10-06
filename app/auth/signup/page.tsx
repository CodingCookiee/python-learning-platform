import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "./_components/signup-form";

export const metadata: Metadata = {
  title: "Create your account and start at the white belt",
  description:
    "Start pylearn at the white belt: a graded path from first Python syntax to advanced Python, then AI automation. Free, and it runs in your browser.",
  alternates: { canonical: "/auth/signup" },
};

export default function SignUpPage() {
  return (
    <AuthShell
      title="Tie on the white belt."
      lede="You start at 16 kyu. Pass your first module's grading and the first stripe goes on."
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Already training?{" "}
            <Link href="/auth/signin" className="font-medium text-primary underline">
              Sign in to your account
            </Link>
          </p>
        </div>
        <SignUpForm />
        <p className="text-sm text-muted-foreground">
          What we keep and why is in the{" "}
          <Link href="/privacy" className="font-medium text-primary underline">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </AuthShell>
  );
}
