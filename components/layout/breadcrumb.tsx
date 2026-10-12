"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // On phones the trail keeps Home, the parent and the current page: the middle folds to "…" and
  // the parent truncates first. The current page keeps its full title up to 70% of the line
  const folds = crumbs.length > 3;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden text-sm text-muted-foreground">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const middle = index > 0 && index < crumbs.length - 2;

        return (
          <React.Fragment key={index}>
            <span
              className={cn(
                "flex min-w-0 items-center gap-1 whitespace-nowrap",
                index === 0 || isLast ? "shrink-0" : "shrink",
                isLast && "max-w-[70%]",
                middle && "max-sm:hidden"
              )}
            >
              {index === 0 && <Home className="size-3 shrink-0" aria-hidden="true" />}

              {crumb.href && !isLast ? (
                <Link href={crumb.href} className="truncate font-medium transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn("truncate font-medium", isLast && "text-foreground")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}

              {!isLast && <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" aria-hidden="true" />}
            </span>
            {index === 0 && folds && (
              <span className="flex shrink-0 items-center gap-1 sm:hidden" aria-hidden="true">
                …
                <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" />
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
