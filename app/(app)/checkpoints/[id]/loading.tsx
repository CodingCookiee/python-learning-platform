import { Skeleton } from "@/components/animations";
import { PageLoading } from "@/components/layout/page-loading";

/** A checkpoint: title and clock, the rules, then its drills */
export default function CheckpointLoading() {
  return (
    <PageLoading label="Loading your checkpoint" className="max-w-4xl">
      <div className="flex flex-col gap-8">
        <Skeleton className="h-3 w-1/2" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-5 w-full max-w-2xl" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex flex-col divide-y divide-border rounded-md border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="size-5 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </PageLoading>
  );
}
