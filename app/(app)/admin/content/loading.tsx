import { PageLoading, SkeletonHeader, SkeletonHeading, SkeletonRows } from "@/components/layout/page-loading";

/** The loading screen for content: a title, then a table per track */
export default function AdminContentLoading() {
  return (
    <PageLoading label="Loading the content overview">
      <div className="flex flex-col gap-10">
        <SkeletonHeader lede={1} />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4">
            <SkeletonHeading />
            <SkeletonRows rows={5} />
          </div>
        ))}
      </div>
    </PageLoading>
  );
}
