import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getAppOrigin } from "@/lib/server-url";
import { isAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { ArrowRight, FileUp, GitBranch } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { SealMark } from "@/components/brand/marks";
import type { EvaluationListItem } from "@/app/api/admin/projects/submissions/route";

async function getSubmissions(cookieHeader: string): Promise<EvaluationListItem[]> {
  const res = await fetch(`${await getAppOrigin()}/api/admin/projects/submissions`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { submissions: EvaluationListItem[] };
  return data.submissions;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminProjectsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/auth/signin");

  const admin = await isAdmin(user.id);
  if (!admin) redirect("/");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const submissions = await getSubmissions(cookieHeader);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-10">
        <FadeIn>
          <AdminHeader
            active="submissions"
            title="Submissions"
            description="Capstone projects waiting for a grade, oldest first. Approving one awards its XP."
            pending={submissions.length}
          />
        </FadeIn>

        <FadeIn delay={0.05}>
          {submissions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-16 text-center">
              <SealMark className="size-8 text-muted-foreground" />
              <p className="font-semibold">The queue is empty.</p>
              <p className="text-sm text-muted-foreground">
                New capstone submissions land here for review.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-sm text-muted-foreground">
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      Project
                    </th>
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      Learner
                    </th>
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      Submitted
                    </th>
                    <th scope="col" className="py-2.5 pr-4 font-medium">
                      Via
                    </th>
                    <th scope="col" className="py-2.5">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-border align-middle">
                      <td className="py-4 pr-4">
                        <span className="flex flex-col gap-0.5">
                          <span className="font-semibold">{submission.project.title}</span>
                          <span className="text-sm text-muted-foreground">
                            {submission.project.moduleTitle}
                          </span>
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="flex flex-col gap-0.5">
                          <span className="font-medium">
                            {submission.submitter.name ?? "Unnamed learner"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {submission.submitter.email}
                          </span>
                        </span>
                      </td>
                      <td className="font-condensed tabular py-4 pr-4 whitespace-nowrap">
                        {formatDate(submission.submittedAt)}
                      </td>
                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
                          {submission.filesPayload.type === "github" ? (
                            <>
                              <GitBranch className="size-4 text-muted-foreground" aria-hidden="true" />
                              GitHub
                            </>
                          ) : (
                            <>
                              <FileUp className="size-4 text-muted-foreground" aria-hidden="true" />
                              Files
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <Button asChild size="sm">
                          <Link href={`/admin/projects/${submission.id}/evaluate`}>
                            Grade
                            <ArrowRight data-icon="inline-end" aria-hidden="true" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
