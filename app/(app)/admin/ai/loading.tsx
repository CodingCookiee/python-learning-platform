import { Skeleton } from "@/components/animations";
import { PageLoading, SkeletonHeader, SkeletonRows } from "@/components/layout/page-loading";

/** The loading screen for AI usage: the range picker, four figures, the daily chart, then two tables */
export default function AdminAiLoading() {
  return (
    <PageLoading label="Loading AI usage">
      <div className="flex flex-col gap-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SkeletonHeader lede={1} className="flex-1" />
          <Skeleton className="h-9 w-56" />
        </div>
        <div className="grid gap-x-10 border-y border-border md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 py-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-10 lg:grid-cols-2">
          <SkeletonRows rows={5} />
          <SkeletonRows rows={5} />
        </div>
      </div>
    </PageLoading>
  );
}
