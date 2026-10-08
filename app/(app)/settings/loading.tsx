import { Skeleton } from "@/components/animations";
import { PageLoading, SkeletonHeader } from "@/components/layout/page-loading";

/** The loading screen for settings: a title, then rows of a label beside its controls */
export default function SettingsLoading() {
  return (
    <PageLoading label="Loading your settings" className="max-w-5xl">
      <div className="flex flex-col gap-10">
        <SkeletonHeader lede={1} />
        <div className="flex flex-col border-t border-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid gap-6 border-b border-border py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full max-w-60" />
              </div>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-9 w-full max-w-md" />
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLoading>
  );
}
