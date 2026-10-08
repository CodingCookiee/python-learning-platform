import { Skeleton } from "@/components/animations";
import { PageLoading, SkeletonHeader, SkeletonHeading, SkeletonRows } from "@/components/layout/page-loading";

/** The loading screen for the learning log: title, this week's check-in beside its preview, then past weeks */
export default function LogLoading() {
  return (
    <PageLoading label="Loading your learning log" className="max-w-6xl">
      <div className="flex flex-col gap-10">
        <SkeletonHeader />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="flex flex-col gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
        <SkeletonHeading />
        <SkeletonRows rows={3} />
      </div>
    </PageLoading>
  );
}
