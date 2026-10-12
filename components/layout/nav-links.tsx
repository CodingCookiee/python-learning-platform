"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** The main nav's links, with the current section marked for the eye and for screen readers */
export function NavLinks({ links }: { links: Array<{ href: string; label: string; also?: string[] }> }) {
  const pathname = usePathname();
  return (
    <>
      {links.map((l) => {
        // A section owns its sub-pages, and any other paths it lists (a lesson is in the Syllabus)
        const current = [l.href, ...(l.also ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "text-muted-foreground underline-offset-[6px] decoration-2 hover:text-foreground",
              current && "font-medium text-foreground underline decoration-primary"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
