import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { paceLine, type CourseHours } from "@/lib/landing/facts";

export interface FaqItem {
  question: string;
  /** Plain text, for the page's structured data */
  answer: string;
  /** What the page shows, when it has a link in it */
  shown?: ReactNode;
}

/** The questions everyone asks first, answered from the real numbers */
export function faqItems(hours: CourseHours): FaqItem[] {
  return [
    {
      question: "What does it cost?",
      answer:
        "Nothing. Lessons, drills, gradings, belts and capstone checks are all free. The AI tutor and reviewer are optional: they use your own Anthropic, OpenAI or Google key, so you pay that provider directly for what you use, and pylearn never bills you.",
    },
    {
      question: "How long does it take?",
      answer: `Start here, the on-ramp, takes about ${hours.start} hours. White belt to black belt is about ${hours.python} hours of training, ${paceLine(hours.python, 5)}. The AI automation grades add about ${hours.automation} hours. Tell the dashboard your weekly hours and it shows your finish date.`,
    },
    {
      question: "What do I need?",
      answer:
        "A browser. Lessons, drills and gradings all run in it, with nothing to install, though a laptop is easier than a phone for longer drills. For capstones you'll install Python on your own computer (module 1 shows you how) and use a free GitHub account.",
    },
    {
      question: "Is a belt a qualification?",
      answer:
        "No. Belts and seals are pylearn's own record of what you've passed, not an accredited certificate. Your capstones are real projects on your GitHub that anyone can look at, and that's what shows your skill.",
    },
    {
      question: "Who can join?",
      answer: "Anyone 16 or over. Your progress is private to your account; see the privacy policy for exactly what's kept.",
      shown: (
        <>
          Anyone 16 or over. Your progress is private to your account; see the{" "}
          <Link href="/privacy" className="font-medium text-primary underline">
            privacy policy
          </Link>{" "}
          for exactly what&apos;s kept.
        </>
      ),
    },
  ];
}

/** The FAQ as `FAQPage` structured data, so search engines and AI answers can quote it */
export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** The landing page's FAQ: native disclosure widgets, no JavaScript needed */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-16 border-t border-border px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
        <h2 id="faq-heading" className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em] sm:text-6xl">
          Questions
        </h2>
        <div className="border-t border-border">
          {items.map((item) => (
            <details key={item.question} className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                {item.question}
                <Plus
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <p className="max-w-[60ch] pb-6 leading-relaxed text-muted-foreground">{item.shown ?? item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
