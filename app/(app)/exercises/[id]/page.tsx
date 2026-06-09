import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn } from "@/components/animations";
import { ExerciseClient } from "./_components/exercise-client";
import type { ExerciseData } from "./_components/exercise-client";

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

async function getExercise(id: string, cookieHeader: string): Promise<ExerciseData | null> {
  const res = await fetch(`${getBaseUrl()}/api/exercises/${id}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) return null;

  return (await res.json()) as ExerciseData;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExercisePage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const { id } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const exercise = await getExercise(id, cookieHeader);
  if (!exercise) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Modules", href: "/modules" },
              {
                label: exercise.lesson.title,
                href: `/modules/${exercise.lesson.moduleId}`,
              },
              {
                label: exercise.lesson.title,
                href: `/lessons/${exercise.lesson.id}`,
              },
              { label: exercise.title },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.05}>
          <ExerciseClient exercise={exercise} />
        </FadeIn>
      </div>
    </div>
  );
}
