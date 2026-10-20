import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasCredentialsInQuery } from "@/lib/strip-credentials";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "./_components/signup-form";

export const metadata: Metadata = {
  title: "Create your account and start at the white belt",
  description:
    "Start pylearn at the white belt: a graded path from first Python syntax to advanced Python, then AI automation. Free, and it runs in your browser.",
  alternates: { canonical: "/auth/signup" },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  // Credentials in the address (an old GET submit): drop them before anything else
  if (hasCredentialsInQuery(params)) redirect("/auth/signup");
  // ?start=new: the landing page's "I've never coded", carried into onboarding; ?start=code forgets it
  const { start } = params;
  return (
    <AuthShell
      title="Tie on the white belt."
      lede="You start at 16 kyu. Pass your first module's grading and the first stripe goes on."
      heading="Create your account"
      sub="Free, and everything runs in your browser."
      switchTo={{ prompt: "Already training?", label: "Sign in", href: "/auth/signin" }}
    >
      <SignUpForm start={typeof start === "string" ? start : undefined} />
    </AuthShell>
  );
}
