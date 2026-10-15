import Link from "next/link";
import { cn } from "@/lib/utils";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { adminLevel } from "@/lib/admin/levels";

type AdminSection =
  | "overview"
  | "users"
  | "submissions"
  | "activity"
  | "notifications"
  | "content"
  | "ai";

/** `super`: only a super admin sees (and may open) it; the rest are every admin's */
const SECTIONS: Array<{ key: AdminSection; label: string; href: string; super?: boolean }> = [
  { key: "overview", label: "Overview", href: "/admin" },
  { key: "users", label: "Users", href: "/admin/users", super: true },
  { key: "submissions", label: "Submissions", href: "/admin/projects" },
  { key: "activity", label: "Activity", href: "/admin/activity", super: true },
  { key: "notifications", label: "Notifications", href: "/admin/notifications" },
  { key: "content", label: "Content", href: "/admin/content", super: true },
  { key: "ai", label: "AI usage", href: "/admin/ai", super: true },
];

/** The signed-in admin's level, for the sections they see */
async function viewerLevel() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return adminLevel(me?.role);
}

/**
 * The examiner's desk header shared by every admin screen: where you are,
 * what the screen is for, and the sections of the desk.
 */
export async function AdminHeader({
  active,
  title,
  description,
  pending,
  actions,
}: {
  active: AdminSection;
  title: string;
  description: string;
  /** Pending submissions, shown on the Submissions tab */
  pending?: number;
  actions?: React.ReactNode;
}) {
  const level = await viewerLevel();
  const sections = SECTIONS.filter((s) => !s.super || level === "super");
  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em]">
            {title}
          </h1>
          <p className="max-w-2xl text-muted-foreground">{description}</p>
        </div>
        {actions}
      </div>
      {/* Seven sections: on a phone they scroll sideways rather than wrap */}
      <nav
        aria-label="Admin sections"
        className="scroll-cue -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
      >
        {sections.map((s) => {
          const isActive = s.key === active;
          return (
            <Link
              key={s.key}
              href={s.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
              {s.key === "submissions" && pending !== undefined && pending > 0 && (
                <span className="font-condensed tabular rounded-sm bg-accent px-1.5 text-xs font-bold text-foreground">
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
