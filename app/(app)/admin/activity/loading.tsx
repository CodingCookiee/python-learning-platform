import { PageLoading, SkeletonHeader, SkeletonRows } from "@/components/layout/page-loading";

/** The loading screen for the audit log: a title, then its rows of admin actions */
export default function AdminActivityLoading() {
  return (
    <PageLoading label="Loading the activity log">
      <div className="flex flex-col gap-10">
        <SkeletonHeader lede={1} />
        <SkeletonRows rows={8} />
      </div>
    </PageLoading>
  );
}
