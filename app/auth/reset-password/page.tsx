import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/email-flows";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell
      title="Fresh start."
      lede="Pick a new password; your belt and streak stay as they are."
      heading="Choose a new password"
      sub="It's the one you'll sign in with from now on."
      switchTo={{ label: "Back to sign in", href: "/auth/signin" }}
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
