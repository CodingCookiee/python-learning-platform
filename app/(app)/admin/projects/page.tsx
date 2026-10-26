import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { ArrowRight, GitBranch } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { SealMark, SheetMark } from "@/components/brand/marks";
import { listPendingSubmissions } from "@/lib/admin/submissions";
import { EmptySlot } from "@/components/brand/empty-slot";

export const metadata: Metadata = { title: "Capstone submissions (admin)" };

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
  // Signed in as an account that no longer exists: clear the stale session (else a redirect loop)
  if (!user) redirect("/auth/session-ended");

  const admin = await isAdmin(user.id);
  if (!admin) redirect("/");

  // Read directly, not through our own API over HTTP. A failed read says so: an empty queue would
  // tell the examiner there's nothing to grade
  const queue = await listPendingSubmissions().catch((error: unknown) => {
    console.error("Error listing submissions:", error);
    return null;
  });
  const submissions = queue?.rows ?? [];

  return (
    <div className="mx-auto max-w-page px-gutter py-8 sm:py-12">
      <StaggerContainer className="flex flex-col gap-10">
        <FadeIn>
          <AdminHeader
            active="submissions"
            title="Submissions"
            description="Capstone projects waiting for a grade, oldest first. Approving one awards its XP."
            pending={queue?.total ?? 0}
          />
        </FadeIn>

        <FadeIn delay={0.05}>
          {!queue ? (
            <EmptySlot center mark={<SealMark />} title="The queue didn't load.">
              Something went wrong reading the submissions. Reload the page to try again.
            </EmptySlot>
          ) : submissions.length === 0 ? (
            <EmptySlot center mark={<SealMark />} title="The queue is empty.">
              New capstone submissions land here for review.
            </EmptySlot>
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
                          {submission.via === "github" ? (
                            <>
                              <GitBranch
                                className="size-4 text-muted-foreground"
                                aria-hidden="true"
                              />
                              GitHub
                            </>
                          ) : (
                            <>
                              <SheetMark className="size-4 text-muted-foreground" />
                              {submission.fileCount === 1 ? "1 file" : `${submission.fileCount} files`}
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
              {queue.total > submissions.length && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Showing the oldest {submissions.length} of {queue.total}. Grade these and the rest move up.
                </p>
              )}
            </div>
          )}
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
