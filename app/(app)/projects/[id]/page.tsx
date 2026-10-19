import type { Metadata } from "next";
import { projectMetadata } from "@/lib/page-titles";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProjectDetail } from "@/lib/project-detail";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { capstoneReviewWait } from "@/lib/review-wait";
import { ProjectDetailClient } from "./_components/project-detail-client";
import type { ProjectDetailData } from "./_components/project-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return projectMetadata(id);
}

/** Read directly rather than through our own API over HTTP, shaped as the API sends it (dates as text) */
async function getProject(id: string, userId: string): Promise<ProjectDetailData | null> {
  const detail = await getProjectDetail(id, userId).catch(() => null);
  return detail ? (JSON.parse(JSON.stringify(detail)) as ProjectDetailData) : null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const { id } = await params;

  const project = await getProject(id, session.user!.id!);
  if (!project) notFound();
  // While it's with the examiner: how long reviews have been taking, and the queue ahead of it
  const reviewWait =
    project.submission?.status === "pending"
      ? await capstoneReviewWait(new Date(project.submission.submittedAt))
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Syllabus", href: "/modules" },
              { label: project.module.title, href: `/modules/${project.module.id}` },
              { label: project.title },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.05}>
          <ProjectDetailClient project={project} reviewWait={reviewWait} />
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
