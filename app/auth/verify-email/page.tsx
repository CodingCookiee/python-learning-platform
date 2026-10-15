import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailForm } from "@/components/auth/email-flows";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell title="One last step." lede="Confirm your email and your white belt is ready.">
      <VerifyEmailForm token={token} />
    </AuthShell>
  );
}
