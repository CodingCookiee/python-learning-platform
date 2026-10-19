import { PageLoading, SkeletonHeader, SkeletonRows } from "@/components/layout/page-loading";

/** The loading screen for one account's record: a title, then its details and actions */
export default function AdminUserLoading() {
  return (
    <PageLoading label="Loading the account">
      <div className="flex flex-col gap-10">
        <SkeletonHeader lede={1} />
        <SkeletonRows rows={6} />
      </div>
    </PageLoading>
  );
}
