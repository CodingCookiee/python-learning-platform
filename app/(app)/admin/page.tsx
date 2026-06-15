import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Users, BookOpen, ArrowRight, ShieldCheck } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/auth/signin");

  const admin = await isAdmin(user.id);
  if (!admin) redirect("/dashboard");

  const [pendingSubmissions, totalUsers, totalModules] = await Promise.all([
    prisma.projectSubmission.count({ where: { status: "pending" } }),
    prisma.user.count(),
    prisma.module.count(),
  ]);

  const stats = [
    {
      label: "Pending Submissions",
      value: pendingSubmissions,
      Icon: ClipboardList,
      href: "/admin/projects",
      cta: "Review",
    },
    { label: "Total Users", value: totalUsers, Icon: Users, href: null, cta: null },
    { label: "Modules", value: totalModules, Icon: BookOpen, href: "/modules", cta: "View" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Admin
              </p>
            </div>
            <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Signed in as {session.user.email}</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map(({ label, value, Icon, href, cta }) => (
              <Card key={label}>
                <CardContent className="flex flex-col gap-4 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                        {label}
                      </p>
                      <p className="font-heading text-3xl font-bold">{value}</p>
                    </div>
                    <Icon
                      className="size-5 text-muted-foreground shrink-0 mt-1"
                      aria-hidden="true"
                    />
                  </div>
                  {href && cta && (
                    <Button variant="outline" size="sm" asChild className="w-fit">
                      <Link href={href}>
                        {cta}
                        <ArrowRight className="size-3" aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Quick Actions
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/admin/projects">
                    <ClipboardList className="size-4" aria-hidden="true" />
                    Review Submissions
                    {pendingSubmissions > 0 && (
                      <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[0.6rem] font-bold">
                        {pendingSubmissions}
                      </span>
                    )}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/admin/content">
                    <BookOpen className="size-4" aria-hidden="true" />
                    Manage Content
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
