import { Skeleton, SkeletonCard, SkeletonLine } from "@/components/animations";
import { PageLoading } from "@/components/layout/page-loading";

export default function EvaluateLoading() {
  return (
    <PageLoading label="Loading the submission" className="max-w-4xl">
      <div className="flex flex-col gap-8">
        {/* Breadcrumb */}
        <SkeletonLine width="50%" className="h-3" />

        {/* Header */}
        <div className="flex flex-col gap-2">
          <SkeletonLine width="25%" className="h-3" />
          <SkeletonLine width="50%" className="h-8" />
          <SkeletonLine width="25%" className="h-4" />
        </div>

        <div className="flex flex-col gap-6">
          {/* Submission info card */}
          <SkeletonCard className="min-h-[120px]" />

          {/* Submission content card */}
          <SkeletonCard className="min-h-[100px]" />

          {/* Success criteria card */}
          <div className="border border-border p-5">
            <div className="flex flex-col gap-4">
              <SkeletonLine width="25%" className="h-4" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="mt-0.5 size-5 shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Feedback card */}
          <SkeletonCard className="min-h-[160px]" />

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
    </PageLoading>
  );
}
