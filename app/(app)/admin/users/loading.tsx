import { PageLoading, SkeletonHeader, SkeletonRows } from "@/components/layout/page-loading";

/** The loading screen for the user list: a title, then the accounts */
export default function AdminUsersLoading() {
  return (
    <PageLoading label="Loading the users">
      <div className="flex flex-col gap-10">
        <SkeletonHeader lede={1} />
        <SkeletonRows rows={8} />
      </div>
    </PageLoading>
  );
}
