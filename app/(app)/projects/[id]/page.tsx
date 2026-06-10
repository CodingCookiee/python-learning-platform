import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { ProjectDetailClient } from "./_components/project-detail-client";
import type { ProjectDetailData } from "./_components/project-detail-client";

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

async function getProject(id: string, cookieHeader: string): Promise<ProjectDetailData | null> {
  const res = await fetch(`${getBaseUrl()}/api/projects/${id}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as ProjectDetailData;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const { id } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const project = await getProject(id, cookieHeader);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Modules", href: "/modules" },
              { label: project.module.title, href: `/modules/${project.module.id}` },
              { label: project.title },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.05}>
          <ProjectDetailClient project={project} />
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
