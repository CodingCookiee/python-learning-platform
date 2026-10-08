import { Skeleton } from "@/components/animations";
import { cn } from "@/lib/utils";

/**
 * A page's loading screen (its route's loading.tsx): a skeleton shaped like the page, announced to
 * screen readers as what's loading ("Loading your review queue"). The skeleton itself is for the eye.
 */
export function PageLoading({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={cn("mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8", className)}>
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/** A page title and its lede, the way most pages open */
export function SkeletonHeader({ lede = 2, className }: { lede?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Skeleton className="h-12 w-2/3 max-w-md" />
      {Array.from({ length: lede }).map((_, i) => (
        <Skeleton key={i} className={cn("h-5 max-w-2xl", i === lede - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** A ruled list: rows of a line and a smaller line, with something at the end */
export function SkeletonRows({ rows = 5, end = true, className }: { rows?: number; end?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col border-t border-border", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border py-3.5">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          {end && <Skeleton className="h-6 w-16" />}
        </div>
      ))}
    </div>
  );
}

/** A section heading */
export function SkeletonHeading({ className }: { className?: string }) {
  return <Skeleton className={cn("h-6 w-48", className)} />;
}

/** The rank card (components/brand/rank-card.tsx): the grade at poster scale beside the belt */
export function SkeletonRankCard() {
  return (
    <div className="grid gap-8 rounded-md border border-border p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-14">
      <div className="flex items-end gap-3">
        <Skeleton className="h-24 w-20 sm:h-28" />
        <div className="flex flex-col gap-2 pb-1.5">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
