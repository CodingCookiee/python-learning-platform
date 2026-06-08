"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  /** Override auto-generated breadcrumbs with custom items */
  items?: BreadcrumbItem[];
}

function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const pathname = usePathname();

  let crumbs: BreadcrumbItem[];

  if (items) {
    crumbs = items;
  } else {
    // Auto-generate from pathname segments
    const segments = pathname.split("/").filter(Boolean);

    // Do not render on root
    if (segments.length === 0) return null;

    crumbs = [
      { label: "Home", href: "/" },
      ...segments.map((segment, index) => ({
        label: formatSegment(decodeURIComponent(segment)),
        href: "/" + segments.slice(0, index + 1).join("/"),
      })),
    ];
  }

  // Don't show breadcrumbs when there's only one crumb (i.e., just "Home")
  if (crumbs.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <span key={index} className="flex items-center gap-1">
            {index === 0 && <Home className="size-3 shrink-0" aria-hidden="true" />}

            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="font-semibold tracking-widest uppercase transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? "font-semibold tracking-widest uppercase text-foreground"
                    : "font-semibold tracking-widest uppercase"
                }
                aria-current={isLast ? "page" : undefined}
              >
                {crumb.label}
              </span>
            )}

            {!isLast && (
              <ChevronRight
                className="size-3 shrink-0 text-muted-foreground/50"
                aria-hidden="true"
              />
            )}
          </span>
        );
      })}
    </nav>
  );
}
