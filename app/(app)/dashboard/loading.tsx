import { SkeletonCard, SkeletonLine, Skeleton } from "@/components/animations";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        {/* Welcome header skeleton */}
        <div className="flex flex-col gap-2">
          <SkeletonLine width="50%" className="h-8" />
          <SkeletonLine width="75%" className="h-4" />
        </div>

        {/* Stats row skeleton */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        {/* Main grid skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Continue learning (2/3) */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <SkeletonLine width="25%" className="h-3" />
            <SkeletonCard className="min-h-[180px]" />
            <div className="flex flex-col gap-2">
              <SkeletonLine width="25%" className="h-3" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>

          {/* Achievements (1/3) */}
          <div className="flex flex-col gap-4">
            <SkeletonLine width="50%" className="h-3" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>

        {/* Module progress skeleton */}
        <div className="flex flex-col gap-4">
          <SkeletonLine width="25%" className="h-3" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
