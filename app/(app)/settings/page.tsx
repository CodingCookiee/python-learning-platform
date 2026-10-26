import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SettingsClient } from "./_components/settings-client";
import { getCredentialSummary, getUsageSummary } from "@/lib/ai/credentials";
import { isEncryptionConfigured } from "@/lib/crypto";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, password: true },
  });
  // Signed in as an account that no longer exists: clear the stale session (else a redirect loop)
  if (!user) redirect("/auth/session-ended");
  const [credential, usage] = await Promise.all([getCredentialSummary(user.id), getUsageSummary(user.id)]);

  return (
    <div className="mx-auto max-w-page px-gutter py-8 sm:py-12">
      <StaggerContainer className="flex flex-col gap-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Settings" }]} />
        <FadeIn>
          <div className="flex flex-col gap-1">
            <h1 className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em]">
              Settings
            </h1>
            <p className="text-muted-foreground">Your name, theme, AI tutor key, password and account.</p>
          </div>
        </FadeIn>
        <FadeIn delay={0.05}>
          <SettingsClient
            initialName={user.name ?? ""}
            email={user.email ?? ""}
            hasPassword={!!user.password}
            ai={{ credential, usage, available: isEncryptionConfigured() }}
          />
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
