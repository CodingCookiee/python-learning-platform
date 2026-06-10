import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { ProjectSubmitClient } from "./_components/project-submit-client";

interface ProjectInfo {
  id: string;
  title: string;
  module: {
    id: string;
    title: string;
  };
}

async function getProject(id: string): Promise<ProjectInfo | null> {
  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      module: { select: { id: true, title: true } },
    },
  });
  return project;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectSubmitPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth/signin");

  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/auth/signin");

  const existingSubmission = await prisma.projectSubmission.findFirst({
    where: {
      userId: user.id,
      projectId: id,
      status: { in: ["pending", "approved"] },
    },
    select: { id: true },
  });
  if (existingSubmission) redirect(`/projects/${id}`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Modules", href: "/modules" },
              { label: project.module.title, href: `/modules/${project.module.id}` },
              { label: project.title, href: `/projects/${id}` },
              { label: "Submit" },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Submit Project</h1>
            <p className="text-sm text-muted-foreground">{project.title}</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <ProjectSubmitClient projectId={id} projectTitle={project.title} />
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
