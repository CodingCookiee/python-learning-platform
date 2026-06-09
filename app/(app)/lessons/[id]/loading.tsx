import { Skeleton, SkeletonLine } from "@/components/animations";

export default function LessonLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        {/* Breadcrumb */}
        <SkeletonLine width="50%" className="h-3" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="flex flex-col gap-4">
              <SkeletonLine width="75%" className="h-4" />
              <SkeletonLine width="50%" className="h-3" />
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 py-2 border-l-2 border-transparent pl-3"
                  >
                    <Skeleton className="size-4 shrink-0 rounded-full" />
                    <div className="flex flex-1 flex-col gap-1">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 flex flex-col gap-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-3 flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            {/* Content skeleton */}
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-6 w-2/5 mt-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-32 w-full" />
            </div>

            {/* Navigation skeleton */}
            <div className="flex items-center justify-between border-t border-border pt-6">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-36" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
