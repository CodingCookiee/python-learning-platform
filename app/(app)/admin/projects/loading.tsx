import { PageLoading, SkeletonHeader, SkeletonRows } from "@/components/layout/page-loading";

/** The loading screen for the capstone queue: a title, then the submissions waiting */
export default function AdminProjectsLoading() {
  return (
    <PageLoading label="Loading the capstone queue">
      <div className="flex flex-col gap-10">
        <SkeletonHeader lede={1} />
        <SkeletonRows rows={6} />
      </div>
    </PageLoading>
  );
}
