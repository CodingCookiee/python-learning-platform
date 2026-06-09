import { Skeleton, SkeletonCard, SkeletonLine } from "@/components/animations";

export default function ModulesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        {/* Header skeleton */}
        <div className="flex flex-col gap-2">
          <SkeletonLine width="25%" className="h-3" />
          <SkeletonLine width="50%" className="h-8" />
          <SkeletonLine width="75%" className="h-4" />
        </div>

        {/* Toolbar skeleton */}
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-44" />
        </div>

        {/* Module grid skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
