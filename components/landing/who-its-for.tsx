import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CARDS = [
  {
    title: "Never coded before",
    text: (
      <>
        Start with <em>Start here</em>, a 4-hour on-ramp in plain language. Every word is explained the first time it
        comes up, every example runs in your browser, and tying your white belt leads you into module 1.
      </>
    ),
    action: { label: "I've never coded", href: "/auth/signup?start=new" },
  },
  {
    title: "Students",
    text: (
      <>
        A clear path with gradings like exams, a record you can show (belts, seals, and capstones on your GitHub), and
        it&apos;s free. Set the hours you have each week, and the dashboard plans your finish date.
      </>
    ),
    action: { label: "Start free", href: "/auth/signup" },
  },
  {
    title: "Developers",
    text: (
      <>
        Test out of what you know with each module&apos;s grading. If you come from JavaScript, side notes put{" "}
        <Link href="#bridge" className="font-medium text-foreground underline decoration-foreground/30 hover:decoration-foreground">
          Python next to the code you already write
        </Link>
        . Then go deep: the data model, concurrency, FastAPI, then AI automation.
      </>
    ),
    action: { label: "I already code", href: "/auth/signup" },
  },
] as const;

/**
 * The landing page's "Who it's for": three readers, each with their own way in. Ruled rows like
 * the syllabus below it, not a row of boxed cards: reader, what they get, their way in
 */
export function WhoItsFor() {
  return (
    <section aria-labelledby="who-heading" className="border-t border-border px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <h2 id="who-heading" className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em] sm:text-6xl">
          Who it&apos;s for
        </h2>
        <ul className="mt-12 flex flex-col border-b border-border">
          {CARDS.map((card) => (
            <li
              key={card.title}
              className="grid gap-4 border-t border-border py-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-x-10 lg:grid-cols-[16rem_minmax(0,1fr)_15rem]"
            >
              <h3 className="font-condensed text-3xl leading-none font-extrabold tracking-[-0.01em]">{card.title}</h3>
              <p className="max-w-[62ch] leading-relaxed text-muted-foreground">{card.text}</p>
              {/* One width for all three: the action column, label left and arrow at the edge */}
              <div className="md:col-start-2 lg:col-start-auto">
                <Button asChild className="w-full justify-between sm:w-60 lg:w-full">
                  <Link href={card.action.href}>
                    {card.action.label}
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
