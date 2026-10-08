import { Skeleton } from "@/components/animations";
import { PageLoading, SkeletonHeading, SkeletonRows } from "@/components/layout/page-loading";

/** The loading screen for the profile: name and rank, the record, then patches beside activity */
export default function ProfileLoading() {
  return (
    <PageLoading label="Loading your profile" className="max-w-6xl">
      <div className="flex flex-col gap-10">
        <div className="flex items-center gap-5">
          <Skeleton className="size-16 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <SkeletonHeading />
          <div className="grid gap-x-10 border-t border-border sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border py-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <SkeletonHeading />
            <SkeletonRows rows={4} />
          </div>
          <div className="flex flex-col gap-5">
            <SkeletonHeading />
            <SkeletonRows rows={4} />
          </div>
        </div>
      </div>
    </PageLoading>
  );
}
