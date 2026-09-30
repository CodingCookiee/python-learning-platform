import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailForm } from "@/components/auth/email-flows";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell title="One last step." lede="Confirm your email and your white belt is ready.">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Confirm your email</h1>
          <p className="text-sm text-muted-foreground">Press the button to finish setting up your account.</p>
        </div>
        <VerifyEmailForm token={token} />
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/signin" className="font-medium text-primary underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
