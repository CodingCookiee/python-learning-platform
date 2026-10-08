import { Skeleton } from "@/components/animations";
import { PageLoading, SkeletonHeader, SkeletonHeading, SkeletonRows } from "@/components/layout/page-loading";

/** The loading screen for the admin home: the review queue beside content and learner figures */
export default function AdminLoading() {
  return (
    <PageLoading label="Loading the admin area">
      <div className="flex flex-col gap-10">
        <SkeletonHeader lede={1} />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            <SkeletonHeading />
            <SkeletonRows rows={5} />
          </div>
          <div className="flex flex-col gap-5">
            <SkeletonHeading />
            <div className="grid grid-cols-2 gap-px border-t border-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 py-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-14" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLoading>
  );
}
