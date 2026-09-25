import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SettingsClient } from "./_components/settings-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { name: true, email: true, password: true },
  });
  if (!user) redirect("/auth/signin");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Settings" }]} />
        <FadeIn>
          <div className="flex flex-col gap-1">
            <h1 className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em]">
              Settings
            </h1>
            <p className="text-muted-foreground">Your name, theme, password and account.</p>
          </div>
        </FadeIn>
        <FadeIn delay={0.05}>
          <SettingsClient
            initialName={user.name ?? ""}
            email={user.email ?? ""}
            hasPassword={!!user.password}
          />
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
