import { Skeleton, SkeletonCard, SkeletonLine } from "@/components/animations";

export default function ModuleDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        {/* Breadcrumb skeleton */}
        <SkeletonLine width="50%" className="h-3" />

        {/* Header skeleton */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <SkeletonLine width="25%" className="h-4" />
              <SkeletonLine width="75%" className="h-8" />
              <SkeletonLine width="50%" className="h-4" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>

        {/* Two-column skeleton */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left column */}
          <div className="flex flex-col gap-8 lg:col-span-2">
            <div className="flex flex-col gap-4">
              <SkeletonLine width="25%" className="h-3" />
              <div className="flex flex-col divide-y divide-border ring-1 ring-foreground/5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 bg-card px-4 py-3">
                    <Skeleton className="size-4 shrink-0 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-24 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    </div>
  );
}
