import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/api-auth";
import { AdminHeader } from "@/components/admin/admin-header";
import { prisma } from "@/lib/prisma";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { TrackTable } from "./_components/track-table";

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

  const tracks = await prisma.track.findMany({
    where: { archivedAt: null },
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      modules: {
        where: { archivedAt: null },
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          summary: true,
          lessons: {
            where: { archivedAt: null },
            select: { _count: { select: { exercises: { where: { archivedAt: null } } } } },
          },
          _count: { select: { projects: { where: { archivedAt: null } } } },
        },
      },
    },
  });

  const rows = tracks.map((track) => ({
    id: track.id,
    slug: track.slug,
    title: track.title,
    summary: track.summary,
    modules: track.modules.map((m) => ({
      id: m.id,
      order: m.order,
      title: m.title,
      summary: m.summary,
      lessons: m.lessons.length,
      drills: m.lessons.reduce((sum, l) => sum + l._count.exercises, 0),
      capstones: m._count.projects,
    })),
  }));

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
          <AdminHeader
            active="content"
            title="Content"
            description="The syllabus as learners see it: each track's modules in order, with their lessons, drills and capstone projects."
          />
        </FadeIn>
        <FadeIn delay={0.08}>
          <p className="rounded-md border border-border bg-sheet px-4 py-3 text-sm text-muted-foreground">
            Content lives in <code className="font-mono text-[0.8125rem] text-foreground">content/</code>{" "}
            as files. Edit them, run{" "}
            <code className="font-mono text-[0.8125rem] text-foreground">npm run content:validate</code>,
            then <code className="font-mono text-[0.8125rem] text-foreground">npm run content:sync</code>.
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="flex flex-col gap-12">
            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                No tracks yet. Run the content sync to load them.
              </p>
            ) : (
              rows.map((track) => <TrackTable key={track.id} track={track} />)
            )}
          </div>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
