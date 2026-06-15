import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ContentClient } from "./_components/content-client";

export default async function ContentManagementPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/auth/signin");
  const admin = await isAdmin(user.id);
  if (!admin) redirect("/dashboard");

  const modules = await prisma.module.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { lessons: true, projects: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Admin", href: "/admin" },
              { label: "Content" },
            ]}
          />
        </FadeIn>
        <FadeIn delay={0.05}>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Content Management</h1>
            <p className="text-sm text-muted-foreground">Manage modules, lessons, and exercises.</p>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <ContentClient initialModules={modules} />
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
