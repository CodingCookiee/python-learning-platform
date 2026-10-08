import { Skeleton } from "@/components/animations";
import { PageLoading, SkeletonHeading } from "@/components/layout/page-loading";

/** A module: its sheet header with progress, what you'll learn, then the lessons */
export default function ModuleDetailLoading() {
  return (
    <PageLoading label="Loading the module" className="max-w-6xl">
      <div className="flex flex-col gap-10">
        <Skeleton className="h-4 w-56" />
        <div className="grid gap-8 border-b border-border pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-14">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-14 w-3/4 max-w-lg" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-full max-w-2xl" />
              <Skeleton className="h-5 w-2/3 max-w-xl" />
            </div>
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex flex-col gap-4 lg:min-w-64 lg:items-end">
            <Skeleton className="h-14 w-28" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
        <div className="flex max-w-3xl flex-col gap-3">
          <SkeletonHeading />
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <SkeletonHeading className="w-28" />
          <div className="flex flex-col border-t border-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-3 border-b border-border py-4">
                <Skeleton className="h-4 w-6" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLoading>
  );
}
