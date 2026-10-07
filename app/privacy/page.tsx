import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { SkipLink } from "@/components/layout/skip-link";

export const metadata: Metadata = {
  title: "Privacy policy: what we keep and why",
  description:
    "What pylearn stores about you, why, who else handles it (the database, email and AI providers you choose), how long it's kept, and how to delete it.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-10-06";

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

export default function PrivacyPage() {
  const contact = process.env.CONTACT_EMAIL;
  return (
    <>
      <SkipLink href="#privacy">Skip to the policy</SkipLink>
      <SiteHeader />
      <main id="privacy" tabIndex={-1} className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12 outline-none sm:px-6">
        <header className="flex flex-col gap-3 border-b border-border pb-8">
          <h1 className="font-condensed text-5xl leading-[0.95] font-extrabold tracking-[-0.02em]">Privacy policy</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            What pylearn keeps about you, why, and how to get it deleted. Last updated{" "}
            <time dateTime={UPDATED}>6 October 2026</time>.
          </p>
        </header>

        <Section id="what" title="What we store">
          <ul>
            <li>
              <strong>Your account:</strong> your name and email, and your password as a one-way hash (never the password
              itself). If you sign in with GitHub or Google, we get your name, email and profile picture from them instead.
            </li>
            <li>
              <strong>Your training:</strong> the lessons you finish, the code you submit for drills and gradings, drafts
              the editor saves as you type, your rank, streak and achievements, and your weekly learning log.
            </li>
            <li>
              <strong>Your capstones and labs:</strong> the files or GitHub links you submit, the examiner&apos;s feedback,
              and, if you connect a GitHub repository, its name and the test results your workflow reports.
            </li>
            <li>
              <strong>Your AI key, if you add one:</strong> encrypted, and shown back to you only by its last four
              characters. For each AI call we log the feature, the model and the token counts, not what you asked or what
              the model answered.
            </li>
          </ul>
          <p>
            We don&apos;t run analytics or advertising trackers, and we don&apos;t sell or share your data with anyone
            beyond the services listed below.
          </p>
        </Section>

        <Section id="age" title="Who it's for">
          <p>
            pylearn is for people 16 and over. Sign-up asks you to confirm your age, and we keep the date you did. If
            you&apos;re under 16, please don&apos;t create an account.
          </p>
        </Section>

        <Section id="why" title="Why">
          <p>
            To run your training: to grade your work, keep your place, show your progress and rank, and send the emails
            you ask for (confirming your address, resetting your password). Nothing is used for anything else.
          </p>
        </Section>

        <Section id="who" title="Who else handles it (sub-processors)">
          <p>pylearn relies on these services, its sub-processors, to work. Each sees only what its job needs:</p>
          <ul>
            <li>
              <strong>Neon</strong> hosts the database that holds everything above.
            </li>
            <li>
              <strong>Upstash</strong> holds short-lived counters that limit how often sign-ins, emails and AI calls can
              happen. Some are keyed by your IP address, and they expire within an hour.
            </li>
            <li>
              <strong>Google (Gmail)</strong> sends our emails, so it sees your email address and the message.
            </li>
            <li>
              <strong>jsDelivr</strong> serves the code editor and the Python that runs in your browser. Your browser
              downloads them directly, so jsDelivr sees your IP address.
            </li>
            <li>
              <strong>GitHub</strong>, if you sign in with it or connect a repository: we read your public repository&apos;s
              workflow runs to confirm test results.
            </li>
            <li>
              <strong>The AI provider you choose</strong> (Anthropic, OpenAI or Google), only if you add your own key: when
              you ask the tutor or request a review, the drill or brief, your code or files and your question go to that
              provider under your key and its terms.
            </li>
            <li>
              <strong>Our hosting provider</strong> serves the site and keeps standard request logs.
            </li>
          </ul>
        </Section>

        <Section id="cookies" title="Cookies and your browser">
          <p>
            One cookie keeps you signed in. Your browser also keeps a few things locally, such as your theme and unsaved
            editor drafts. They never leave your device unless the page saves them to your account.
          </p>
        </Section>

        <Section id="keep" title="How long we keep it">
          <p>
            For as long as you have an account. When you delete it in{" "}
            <Link href="/settings" className="font-medium text-primary underline">
              Settings
            </Link>
            , your account and everything attached to it (progress, submissions, drafts, keys, logs) is deleted at once.
            Backups held by the database provider age out on its own schedule.
          </p>
        </Section>

        <Section id="rights" title="Your rights and how to reach us">
          <p>
            You can see and change your details in Settings, delete your account there, and ask us for a copy of your
            data or anything else about this policy.{" "}
            {contact ? (
              <>
                Write to{" "}
                <a href={`mailto:${contact}`} className="font-medium text-primary underline">
                  {contact}
                </a>
                .
              </>
            ) : (
              <>Reply to any email pylearn has sent you.</>
            )}
          </p>
          <p>
            If this policy changes in a way that matters, we&apos;ll say so on this page and, for big changes, by email.
          </p>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
