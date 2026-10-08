import { Skeleton } from "@/components/animations";
import { PageLoading, SkeletonHeader, SkeletonHeading, SkeletonRows } from "@/components/layout/page-loading";

/** The loading screen for achievements: the count, then a ruled list per category */
export default function AchievementsLoading() {
  return (
    <PageLoading label="Loading your achievements">
      <div className="flex flex-col gap-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SkeletonHeader lede={1} className="flex-1" />
          <Skeleton className="h-14 w-28" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-5">
            <SkeletonHeading />
            <SkeletonRows rows={4} />
          </div>
        ))}
      </div>
    </PageLoading>
  );
}
