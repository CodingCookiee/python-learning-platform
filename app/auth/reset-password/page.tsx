import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/email-flows";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell title="Fresh start." lede="Pick a new password; your belt and streak stay as they are.">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">At least 8 characters.</p>
        </div>
        <ResetPasswordForm token={token} />
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/signin" className="font-medium text-primary underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
