import { Skeleton, SkeletonLine } from "@/components/animations";

export default function ProjectSubmitLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        {/* Breadcrumb */}
        <SkeletonLine width="50%" className="h-3" />

        {/* Heading */}
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Tab bar */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-40" />
        </div>

        {/* Card placeholder */}
        <div className="flex flex-col gap-4 rounded-sm border border-border bg-card p-6">
          <Skeleton className="h-28 w-full" />
        </div>

        {/* Notes card */}
        <div className="flex flex-col gap-2 rounded-sm border border-border bg-card p-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* Buttons row */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  );
}
