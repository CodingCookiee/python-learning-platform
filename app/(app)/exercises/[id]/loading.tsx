import { Skeleton, SkeletonLine } from "@/components/animations";

export default function ExerciseLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        {/* Breadcrumb */}
        <SkeletonLine width="50%" className="h-3" />

        {/* Desktop two-column layout */}
        <div className="hidden lg:grid lg:grid-cols-5 lg:gap-8">
          {/* Left: instructions skeleton */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Badges */}
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
            {/* Title */}
            <Skeleton className="h-8 w-3/4" />
            {/* Description lines */}
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            {/* Test cases heading */}
            <Skeleton className="h-3 w-24 mt-2" />
            {/* Test case items */}
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-border p-3 flex flex-col gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: editor skeleton */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Editor area */}
            <Skeleton className="h-[400px] w-full" />
            {/* Action row */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-5 w-20" />
            </div>
            {/* Hints section */}
            <div className="border border-border p-4 flex flex-col gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </div>

        {/* Mobile skeleton */}
        <div className="lg:hidden flex flex-col gap-4">
          {/* Tab bar */}
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
          {/* Content */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-48 w-full mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
