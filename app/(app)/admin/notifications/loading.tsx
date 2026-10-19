import { PageLoading, SkeletonHeader, SkeletonRows } from "@/components/layout/page-loading";

/** The loading screen for the notifications: a title, then the list */
export default function AdminNotificationsLoading() {
  return (
    <PageLoading label="Loading the notifications">
      <div className="flex flex-col gap-10">
        <SkeletonHeader lede={1} />
        <SkeletonRows rows={6} />
      </div>
    </PageLoading>
  );
}
