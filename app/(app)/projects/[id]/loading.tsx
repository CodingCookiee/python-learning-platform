import { Skeleton, SkeletonCard, SkeletonLine } from "@/components/animations";

export default function ProjectDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        {/* Breadcrumb skeleton */}
        <SkeletonLine width="50%" className="h-3" />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left column */}
          <div className="flex flex-col gap-8 lg:col-span-2">
            {/* Header block */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-32" />
              </div>
              <SkeletonLine width="75%" className="h-9" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <SkeletonLine width="75%" className="h-4" />
              </div>
            </div>

            {/* Requirements section */}
            <div className="flex flex-col gap-4">
              <SkeletonLine width="25%" className="h-3" />
              <div className="border border-border">
                <div className="flex flex-col divide-y divide-border">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3 px-5 py-3">
                      <Skeleton className="mt-0.5 h-4 w-5 shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Success criteria section */}
            <div className="flex flex-col gap-4">
              <SkeletonLine width="25%" className="h-3" />
              <div className="border border-border">
                <div className="flex flex-col divide-y divide-border">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3">
                      <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
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
