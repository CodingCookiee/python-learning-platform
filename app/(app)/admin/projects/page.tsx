import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { ClipboardList, Clock, ArrowRight, User } from "lucide-react";
import type { EvaluationListItem } from "@/app/api/admin/projects/submissions/route";

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

async function getSubmissions(cookieHeader: string): Promise<EvaluationListItem[]> {
  const res = await fetch(`${getBaseUrl()}/api/admin/projects/submissions`, {
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
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <div className="flex flex-col gap-1">
            <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              Admin
            </p>
            <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Project Submissions</h1>
            <p className="text-sm text-muted-foreground">
              Review and evaluate pending project submissions from learners.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <ClipboardList className="size-8 text-muted-foreground" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">No pending submissions</p>
                  <p className="text-xs text-muted-foreground">
                    All project submissions have been evaluated.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {submissions.length} pending{" "}
                {submissions.length === 1 ? "submission" : "submissions"}
              </p>
              {submissions.map((submission) => (
                <Card key={submission.id}>
                  <CardContent className="flex flex-col gap-4 pt-5 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {submission.project.moduleTitle}
                        </Badge>
                        <Badge className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">
                          <Clock className="size-3" aria-hidden="true" />
                          Pending Review
                        </Badge>
                      </div>

                      <h2 className="font-heading text-sm font-semibold sm:text-base">
                        {submission.project.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <User className="size-3" aria-hidden="true" />
                          {submission.submitter.name ?? submission.submitter.email}
                          {submission.submitter.name && (
                            <span className="opacity-60">({submission.submitter.email})</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3" aria-hidden="true" />
                          Submitted {formatDate(submission.submittedAt)}
                        </span>
                        <span className="text-xs">
                          via{" "}
                          {submission.filesPayload.type === "github"
                            ? "GitHub link"
                            : "file upload"}
                        </span>
                      </div>
                    </div>

                    <Button asChild className="w-full sm:w-auto shrink-0" size="sm">
                      <Link href={`/admin/projects/${submission.id}/evaluate`}>
                        Evaluate
                        <ArrowRight className="size-3" aria-hidden="true" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
