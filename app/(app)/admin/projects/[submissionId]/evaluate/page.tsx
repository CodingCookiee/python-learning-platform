import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { EvaluateClient } from "./_components/evaluate-client";
import { parseProjectListText } from "@/lib/project-content";

export interface SubmissionDetail {
  id: string;
  status: string;
  submittedAt: string;
  filesPayload: {
    type: "files" | "github";
    url?: string;
    files?: Array<{ name: string; size: number; type: string; content?: string }>;
    notes?: string | null;
  };
  project: {
    id: string;
    title: string;
    successCriteria: string[];
    module: {
      id: string;
      title: string;
    };
  };
  submitter: {
    id: string;
    name: string | null;
    email: string;
  };
}

async function getSubmissionDetail(submissionId: string): Promise<SubmissionDetail | null> {
  const submission = await prisma.projectSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      files: true,
      userId: true,
      project: {
        select: {
          id: true,
          title: true,
          successCriteria: true,
          module: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!submission) return null;

  const user = await prisma.user.findUnique({
    where: { id: submission.userId },
    select: { id: true, name: true, email: true },
  });

  let filesPayload: SubmissionDetail["filesPayload"] = { type: "files" };
  try {
    filesPayload = JSON.parse(submission.files) as SubmissionDetail["filesPayload"];
  } catch {
    // keep default
  }

  const successCriteria = parseProjectListText(submission.project.successCriteria);

  return {
    id: submission.id,
    status: submission.status,
    submittedAt: submission.submittedAt.toISOString(),
    filesPayload,
    project: {
      id: submission.project.id,
      title: submission.project.title,
      successCriteria,
      module: submission.project.module,
    },
    submitter: {
      id: submission.userId,
      name: user?.name ?? null,
      email: user?.email ?? "",
    },
  };
}

interface PageProps {
  params: Promise<{ submissionId: string }>;
}

export default async function AdminEvaluatePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth/signin");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!dbUser) redirect("/auth/signin");

  const admin = await isAdmin(dbUser.id);
  if (!admin) redirect("/");

  const { submissionId } = await params;
  const submission = await getSubmissionDetail(submissionId);
  if (!submission) notFound();

  if (submission.status !== "pending") redirect("/admin/projects");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Admin", href: "/admin/projects" },
              { label: "Submissions", href: "/admin/projects" },
              { label: "Evaluate" },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="flex flex-col gap-1">
            <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              Admin
            </p>
            <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Evaluate Submission</h1>
            <p className="text-sm text-muted-foreground">{submission.project.title}</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <EvaluateClient submission={submission} />
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
