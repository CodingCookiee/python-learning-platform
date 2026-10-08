import { Skeleton } from "@/components/animations";
import { PageLoading, SkeletonHeading, SkeletonRankCard, SkeletonRows } from "@/components/layout/page-loading";

/** The dashboard: the welcome, the rank card, streak and XP, this week, the log and achievements, the current belt */
export default function DashboardLoading() {
  return (
    <PageLoading label="Loading your dashboard">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-2/3 max-w-md" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <SkeletonRankCard />
        <div className="grid gap-x-10 border-y border-border md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 py-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-full max-w-48" />
            </div>
          ))}
        </div>
        <div className="grid gap-x-10 gap-y-4 rounded-md border border-border p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <SkeletonHeading className="w-36" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="flex flex-col gap-4">
            <SkeletonHeading />
            <SkeletonRows rows={3} end={false} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <SkeletonHeading className="w-44" />
          <SkeletonRows rows={3} />
        </div>
      </div>
    </PageLoading>
  );
}
