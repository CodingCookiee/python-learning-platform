import Link from "next/link";
import { cn } from "@/lib/utils";

type AdminSection = "overview" | "submissions" | "content";

const SECTIONS: Array<{ key: AdminSection; label: string; href: string }> = [
  { key: "overview", label: "Overview", href: "/admin" },
  { key: "submissions", label: "Submissions", href: "/admin/projects" },
  { key: "content", label: "Content", href: "/admin/content" },
];

/**
 * The examiner's desk header shared by every admin screen: where you are,
 * what the screen is for, and the sections of the desk.
 */
export function AdminHeader({
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
      <nav aria-label="Admin sections" className="flex gap-1 border-b border-border">
        {SECTIONS.map((s) => {
          const isActive = s.key === active;
          return (
            <Link
              key={s.key}
              href={s.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium",
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
