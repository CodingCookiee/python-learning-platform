import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { SkipLink } from "@/components/layout/skip-link";
import { getLandingData } from "@/lib/landing/facts";
import { Faq, faqItems } from "@/components/landing/faq";
import { BLACK_BELT } from "@/lib/black-belt";
import { BELT_DRILLS_PER_MODULE, CHECKPOINT_MINUTES_PER_DRILL, CHECKPOINT_RETRY_MINUTES, REVIEW_INTERVALS } from "@/lib/mastery-rules";
import { publicOrigin } from "@/lib/public-origin";
import { PROFILE_LINKS } from "@/lib/landing/structured-data";

export const metadata: Metadata = {
  title: "About pylearn: how gradings, capstones and certificates work",
  description:
    "How pylearn works: rank earned through timed gradings, capstones read by an examiner, what the black belt takes, and how to verify a pylearn certificate.",
  alternates: { canonical: "/about" },
};

/** The grading every module ends with: the same terms across the syllabus (content: checkpoint pick and pass mark) */
const GRADING_DRILLS = 6;
const PASS_MARK = 80;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-2xl font-semibold tracking-[-0.01em]">
        {title}
      </h2>
      <div className="flex flex-col gap-3 leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}

/**
 * /about: what pylearn is and how its rank, capstones and certificates are earned, so a learner, a
 * verifier holding a certificate, a search engine or an AI answer can rely on it. Every number comes
 * from the content or the rules in code.
 */
export default async function AboutPage() {
  const { modules, lessonCount, hours, automationModules } = await getLandingData();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const origin = publicOrigin();
  const reviewDays = REVIEW_INTERVALS.join(", ");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${origin}/about`,
    url: `${origin}/about`,
    name: "About pylearn",
    about: { "@id": `${origin}/#organization` },
    isPartOf: { "@id": `${origin}/#website` },
  };

  return (
    <>
      <SkipLink href="#about">Skip to the page</SkipLink>
      <SiteHeader />
      <main id="about" tabIndex={-1} className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12 outline-none sm:px-6">
        <header className="flex flex-col gap-3 border-b border-border pb-8">
          <h1 className="font-condensed text-5xl leading-[0.95] font-extrabold tracking-[-0.02em]">About pylearn</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            A free, graded path from your first line of Python to advanced Python, then AI automation. Every lesson, drill
            and grading runs in your browser, with nothing to install.
          </p>
        </header>

        <Section id="what" title="What it is">
          <ul>
            <li>
              <strong>Python, white belt to black belt:</strong> {modules.length} modules and {lessonCount} lessons, about{" "}
              {Math.round(hours.python)} hours, from first syntax to the data model, concurrency, FastAPI and databases.
            </li>
            <li>
              <strong>AI automation, the dan grades:</strong> {automationModules.length} more modules, about{" "}
              {Math.round(hours.automation)} hours: LLM APIs, tool calling, retrieval, agents, MCP servers and production
              systems.
            </li>
            <li>
              <strong>Start here:</strong> a short on-ramp for people who have never programmed. It&apos;s optional and
              gives no grade.
            </li>
          </ul>
          <p>
            Python runs in your browser (CPython compiled to WebAssembly), so the examples and drills are real Python, not
            a simulation. pylearn is free and is for people 16 and over.
          </p>
        </Section>

        <Section id="gradings" title="How rank is earned">
          <p>
            Rank moves only when you pass a grading, never from XP or time spent. Each module ends with one:
          </p>
          <ul>
            <li>
              {GRADING_DRILLS} drills drawn from the module, {CHECKPOINT_MINUTES_PER_DRILL} minutes each (
              {GRADING_DRILLS * CHECKPOINT_MINUTES_PER_DRILL} minutes in all), and {PASS_MARK}% to pass.
            </li>
            <li>No hints, no reference solution, no AI tutor, and no copy and paste. The clock doesn&apos;t pause.</li>
            <li>Each drill is checked by tests that run your code. If you don&apos;t pass, a fresh set of drills is ready {CHECKPOINT_RETRY_MINUTES} minutes later.</li>
            <li>Already know a module? You can take its grading before the lessons to test out.</li>
            <li>
              Already know a whole belt? One belt test-out covers the rest of it in a single sitting: {BELT_DRILLS_PER_MODULE}{" "}
              drills from each module still to pass, on the same terms. Passing it passes them all.
            </li>
          </ul>
          <p>
            Passing puts a stripe on your belt. Grades count down in kyu, from 16 kyu to 1 kyu; the black belt is 1st dan,
            and the AI automation modules count up from there.
          </p>
          <p>
            Skills are kept, not just reached: drills you solve come back for review after {reviewDays} days, and you solve
            them again from a blank start.
          </p>
        </Section>

        <Section id="capstones" title="Capstones and the examiner">
          <p>
            Every module has a capstone project you build on your own computer. You hand it in as files or a public GitHub
            repository, and an examiner reads it against the brief&apos;s success criteria, then approves it or sends it
            back with feedback. A capstone whose acceptance tests pass in GitHub Actions on your repository counts as passed
            too.
          </p>
          <p>
            The examiner can ask an AI for a second reading of the work, but a person makes the decision. Learners can also
            run an AI review of their own submission on their own key; it advises and never passes anything.
          </p>
        </Section>

        <Section id="black-belt" title="The black belt">
          <p>The black belt asks for more than passing the last module. It takes all three of:</p>
          <ul>
            <li>every Python module&apos;s grading passed;</li>
            <li>
              the advanced topics (modules {BLACK_BELT.advancedModules.from} to {BLACK_BELT.advancedModules.to}) held at{" "}
              {Math.round(BLACK_BELT.masteryTarget * 100)}% or more, which only drills that have survived spaced review can
              reach;
            </li>
            <li>{BLACK_BELT.capstonesNeeded} Python capstone projects approved.</li>
          </ul>
        </Section>

        <Section id="certificates" title="Certificates, and how to check one">
          <p>
            There are two certificates: <strong>Black belt in Python</strong>, and <strong>AI automation, 9th dan</strong>{" "}
            for passing every AI automation module. A learner who has earned one claims it and confirms the name to print.
          </p>
          <p>
            Each certificate has an ID, such as PL-PY-7K2M-9QXD, and its own page at{" "}
            <span className="font-mono text-[0.9375rem]">{origin}/certificates/</span>
            <em>ID</em>. To check one, open that page: it shows the holder&apos;s name, the date and the ID, from
            pylearn&apos;s own records. If the page says there&apos;s no certificate, the ID is wrong or the holder has
            withdrawn its public page.
          </p>
          <p>
            A pylearn certificate records what pylearn&apos;s gradings and examiners verified. It isn&apos;t an accredited
            qualification.
          </p>
        </Section>

        <Section id="ai" title="AI help, on your own key">
          <p>
            The AI tutor, the error explainer and capstone reviews use an API key you add in Settings (Anthropic, OpenAI or
            Google Gemini), so you choose the model and pay your provider directly. The tutor helps with hints and questions
            rather than writing the answer, and it&apos;s off during gradings. Everything else works without a key.
          </p>
        </Section>

        <Faq items={faqItems(hours)} compact />

        <Section id="contact" title="More help">
          <p>
            For anything else, see the <a href="#faq" className="font-medium text-primary underline">common questions</a> above,
            or <Link href="/contact" className="font-medium text-primary underline">contact pylearn</Link>. What pylearn
            keeps about you is in the <Link href="/privacy" className="font-medium text-primary underline">privacy policy</Link>.
          </p>
          <p>
            pylearn is also on{" "}
            {PROFILE_LINKS.map((p, i) => (
              <span key={p.href}>
                {i > 0 && (i === PROFILE_LINKS.length - 1 ? " and " : ", ")}
                <a href={p.href} rel="me noopener" className="font-medium text-primary underline">
                  {p.label}
                </a>
              </span>
            ))}
            .
          </p>
        </Section>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
