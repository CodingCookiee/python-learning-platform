import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/animations";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const metadata: Metadata = { title: "Set up your training" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, onboardedAt: true, ageConfirmedAt: true, experience: true, goal: true, weeklyHours: true },
  });
  if (!user) redirect("/auth/signin");

  const first = !user.onboardedAt;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <FadeIn>
        <header className="mb-10 flex flex-col gap-3">
          <p className="text-sm font-semibold text-primary">{first ? "Before your first lesson" : "Your training plan"}</p>
          <h1 className="font-condensed text-5xl leading-[0.95] font-extrabold tracking-[-0.02em]">
            {first ? `Welcome to the mat${user.name ? `, ${user.name.split(" ")[0]}` : ""}.` : "Change your plan"}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {user.ageConfirmedAt ? "Three" : "Four"} questions so the course meets you where you are. You can change your
            plan later from the dashboard.
          </p>
        </header>
      </FadeIn>
      <FadeIn delay={0.05}>
        <OnboardingForm
          first={first}
          askAge={!user.ageConfirmedAt}
          initial={{
            experience: (user.experience as "new" | "other-language" | "python" | null) ?? null,
            goal: (user.goal as "python" | "automation" | null) ?? null,
            weeklyHours: user.weeklyHours,
          }}
        />
      </FadeIn>
    </div>
  );
}
