import { Skeleton } from "@/components/animations";
import { PageLoading } from "@/components/layout/page-loading";

/** The review queue: title and lede, the week strip, then the due drills */
export default function ReviewLoading() {
  return (
    <PageLoading label="Loading your review queue" className="max-w-4xl">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-5 w-full max-w-2xl" />
          <Skeleton className="h-5 w-2/3 max-w-xl" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
        <div className="flex flex-col divide-y divide-border border-y border-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </div>
      </div>
    </PageLoading>
  );
}
