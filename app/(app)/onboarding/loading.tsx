import { Skeleton } from "@/components/animations";
import { PageLoading, SkeletonHeader } from "@/components/layout/page-loading";

/** The loading screen for onboarding: a title, then the questions as stacks of choices */
export default function OnboardingLoading() {
  return (
    <PageLoading label="Loading your plan" className="max-w-3xl">
      <div className="flex flex-col gap-10">
        <SkeletonHeader />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-5 w-56" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-16 w-full" />
            ))}
          </div>
        ))}
      </div>
    </PageLoading>
  );
}
