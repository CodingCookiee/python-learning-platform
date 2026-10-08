import { Skeleton } from "@/components/animations";
import { PageLoading, SkeletonRankCard } from "@/components/layout/page-loading";

/** The syllabus: the title and the count passed, the rank card, then a section per belt */
export default function ModulesLoading() {
  return (
    <PageLoading label="Loading the syllabus">
      <div className="flex flex-col gap-10">
        <Skeleton className="h-4 w-40" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-14 w-2/3 max-w-sm" />
            <Skeleton className="h-5 w-full max-w-2xl" />
            <Skeleton className="h-5 w-2/3 max-w-xl" />
          </div>
          <Skeleton className="h-14 w-44" />
        </div>
        <SkeletonRankCard />
        <div className="flex flex-col">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid gap-5 border-t border-border py-7 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10">
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex flex-col">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-3 py-3.5">
                    <Skeleton className="h-4 w-8" />
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                    <Skeleton className="h-4 w-20 self-center" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLoading>
  );
}
