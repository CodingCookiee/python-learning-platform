import Link from "next/link";
import { EmptySlot } from "@/components/brand/empty-slot";
import { Button } from "@/components/ui/button";
import { waitInWords } from "@/lib/reading-pace";

/** In place of a lesson or drill when the learner has opened new ones faster than anyone reads (lib/reading-pace.ts) */
export function ReadingPause({ retryAfter }: { retryAfter: number }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-gutter py-12 sm:py-16">
      <h1 className="font-condensed text-4xl leading-none font-extrabold tracking-[-0.02em]">
        New pages are paused for a while
      </h1>
      {/* The slot's default Locked mark: new pages aren't open yet (DESIGN.md, Empty Slot) */}
      <EmptySlot
        title={`They open again in ${waitInWords(retryAfter)}`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/review">Go to review</Link>
          </Button>
        }
      >
        You&apos;ve opened a lot of new lessons and drills in a short time, faster than anyone reads them, so we&apos;ve
        paused new ones to keep the course from being copied. Pages you&apos;ve already opened still work, and review is
        a good use of the wait.
      </EmptySlot>
    </div>
  );
}
