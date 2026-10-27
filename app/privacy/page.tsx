import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { SkipLink } from "@/components/layout/skip-link";

export const metadata: Metadata = {
  title: "Privacy and terms",
  description:
    "The terms of using pylearn, and what it stores about you: why, who else handles it (the database, email and AI providers you choose), how long it's kept, and how to delete it.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-10-27";

/** One part of the page: the terms of use, or the privacy policy */
function Part({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex scroll-mt-20 flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h2
          id={id}
          className="font-condensed text-4xl leading-[0.95] font-extrabold tracking-[-0.02em]"
        >
          {title}
        </h2>
        <p className="leading-relaxed text-muted-foreground">{lede}</p>
      </div>
      {children}
    </section>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex scroll-mt-20 flex-col gap-3">
      <h3 id={id} className="text-2xl font-semibold tracking-[-0.01em]">
        {title}
      </h3>
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
      <SkipLink href="#main">Skip to the terms and policy</SkipLink>
      <SiteHeader />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-3xl flex-col gap-14 px-gutter py-12 outline-none"
      >
        <header className="flex flex-col gap-4 border-b border-border pb-8">
          <h1 className="font-condensed text-5xl leading-[0.95] font-extrabold tracking-[-0.02em]">
            Privacy and terms
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            The rules of training at pylearn, and what it keeps about you, why, and how to get it
            deleted. Last updated <time dateTime={UPDATED}>27 October 2026</time>.
          </p>
          <nav aria-label="On this page" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href="#terms" className="font-medium text-primary underline">
              Terms of use
            </a>
            <a href="#privacy" className="font-medium text-primary underline">
              Privacy policy
            </a>
          </nav>
        </header>

        <Part
          id="terms"
          title="Terms of use"
          lede="By creating an account or using pylearn, you agree to these terms. If you don't agree, don't use it."
        >
          <Section id="terms-what" title="What pylearn is">
            <p>
              pylearn is a free course in Python and AI automation that runs in your browser. We may
              add, change or remove lessons, drills and features as the course improves. If we ever
              close it, we&apos;ll say so on the site first.
            </p>
          </Section>

          <Section id="terms-account" title="Your account">
            <ul>
              <li>
                One account per person, with your own name and an email address you can receive mail
                at.
              </li>
              <li>
                Keep your password to yourself. What happens under your account is your
                responsibility, so if you think someone else has used it, change the password in
                Settings and tell us.
              </li>
            </ul>
          </Section>

          <Section id="terms-fair" title="Training fairly">
            <p>
              Drills and gradings are checked in your browser, on trust. Your belt, stripes and rank
              mean something only if they show your own work, so:
            </p>
            <ul>
              <li>don&apos;t fake a pass, or alter the page or its requests to record one;</li>
              <li>don&apos;t hand in someone else&apos;s code as your capstone;</li>
              <li>don&apos;t publish the answers to graded drills.</li>
            </ul>
            <p>
              Capstones are reviewed by a person, an examiner, before they count. A rank, pass or
              certificate earned unfairly can be withdrawn.
            </p>
          </Section>

          <Section id="terms-use" title="Using pylearn properly">
            <p>Don&apos;t:</p>
            <ul>
              <li>
                try to break into, overload or disrupt pylearn, or get round its limits and
                security;
              </li>
              <li>
                create accounts or use pylearn with bots or scripts, or copy the course out of it in
                bulk;
              </li>
              <li>
                upload anything harmful or unlawful, including malware, or anything that isn&apos;t
                yours to share;
              </li>
              <li>harass anyone, or pretend to be someone else.</li>
            </ul>
          </Section>

          <Section id="terms-work" title="Your work and ours">
            <ul>
              <li>
                <strong>Your code and capstones stay yours.</strong> You let pylearn store them, run
                them, and show them to you and to our examiners, so your work can be graded. If you
                claim a certificate, its public page shows the details described in the privacy
                policy below.
              </li>
              <li>
                <strong>The course is ours:</strong> the lessons, drills, tests and capstone briefs.
                Use them to learn, and quote them in your own notes, but don&apos;t republish the
                course or build another course from it.
              </li>
            </ul>
          </Section>

          <Section id="terms-ai" title="AI features on your own key">
            <p>
              The tutor, the Sensei and AI reviews are optional and run on an AI key you add
              yourself. What you send goes to that provider under its terms, and what it charges is
              between you and it. AI answers can be wrong or incomplete: treat them as a training
              partner&apos;s suggestion and check them.
            </p>
          </Section>

          <Section id="terms-certificates" title="Certificates">
            <p>
              A pylearn certificate records what you completed on pylearn. It isn&apos;t an
              accredited qualification or a degree. We can withdraw a certificate earned by breaking
              these terms, and you can withdraw your own at any time.
            </p>
          </Section>

          <Section id="terms-ending" title="Suspending or closing an account">
            <p>
              You can delete your account at any time in Settings. We may suspend or remove an
              account that breaks these terms. If we remove one for abuse, we may stop its email
              address from signing up again, as the privacy policy below explains.
            </p>
          </Section>

          <Section id="terms-warranty" title="No guarantees, and the limits of our liability">
            <p>
              pylearn is free and provided as it is. We work to keep it running and its lessons
              correct, but we can&apos;t promise it will always be available, free of mistakes, or
              that it will get you a job or a qualification.
            </p>
            <p>
              As far as the law allows, pylearn isn&apos;t liable for indirect or consequential
              losses from using it, or for anything done by services you connect to it, such as your
              AI provider or GitHub. Nothing in these terms takes away rights you have under
              consumer law that can&apos;t be taken away.
            </p>
          </Section>

          <Section id="terms-changes" title="Changes to these terms">
            <p>
              If these terms change in a way that matters, we&apos;ll say so on this page and, for
              big changes, by email. Using pylearn after a change means you accept the new terms.
              Questions about them go to the address under{" "}
              <a href="#rights" className="font-medium text-primary underline">
                how to reach us
              </a>
              .
            </p>
          </Section>
        </Part>

        <Part
          id="privacy"
          title="Privacy policy"
          lede="What pylearn keeps about you, why, who else handles it, and how to get it deleted."
        >
          <Section id="what" title="What we store">
            <ul>
              <li>
                <strong>Your account:</strong> your name and email, and your password as a one-way
                hash (never the password itself). If you sign in with GitHub or Google, we get your
                name, email and profile picture from them instead. When you choose a password, we
                check it hasn&apos;t appeared in a known data breach using Have I Been Pwned&apos;s
                range service: only the first five characters of a hash of it are sent, never the
                password.
              </li>
              <li>
                <strong>Your training:</strong> the lessons you finish, the code you submit for
                drills and gradings, drafts the editor saves as you type, your rank, streak and
                achievements, your weekly learning log, and when you last used the app (so we can
                see how many people are training).
              </li>
              <li>
                <strong>Your capstones and labs:</strong> the files or GitHub links you submit, the
                examiner&apos;s feedback, and, if you connect a GitHub repository, its name and the
                test results your workflow reports.
              </li>
              <li>
                <strong>Your certificates, if you claim one:</strong> its page is public, so anyone
                with its link or ID can check it. It shows the name you choose to print, the track,
                and the dates. You can withdraw it at any time.
              </li>
              <li>
                <strong>Your AI key, if you add one:</strong> encrypted, and shown back to you only
                by its last four characters. For each AI call we log the feature, the model and the
                token counts, not what you asked or what the model answered.
              </li>
            </ul>
            <p>
              We don&apos;t run analytics or advertising trackers, and we don&apos;t sell or share
              your data with anyone beyond the services listed below.
            </p>
          </Section>

          <Section id="age" title="Who it's for">
            <p>
              pylearn is open to anyone who wants to learn. We don&apos;t ask for your age. If
              you&apos;re a parent or guardian and want a child&apos;s account and everything in it
              deleted, contact us and we&apos;ll do it.
            </p>
          </Section>

          <Section id="why" title="Why">
            <p>
              To run your training: to grade your work, keep your place, show your progress and
              rank, and send the emails you ask for (confirming your address, resetting your
              password). Nothing is used for anything else.
            </p>
          </Section>

          <Section id="who" title="Who else handles it (sub-processors)">
            <p>
              pylearn relies on these services, its sub-processors, to work. Each sees only what its
              job needs:
            </p>
            <ul>
              <li>
                <strong>Neon</strong> hosts the database that holds everything above.
              </li>
              <li>
                <strong>Upstash</strong> holds short-lived counters that limit how often sign-ins,
                emails and AI calls can happen. Some are keyed by your IP address, and they expire
                within an hour. One lists which lessons and drills you&apos;ve opened, so that the
                course can&apos;t be copied out in bulk; it expires within a day.
              </li>
              <li>
                <strong>Resend</strong> (or <strong>Google&apos;s Gmail</strong>) sends our emails,
                so it sees your email address and the message.
              </li>
              <li>
                <strong>jsDelivr</strong> serves the code editor and the Python that runs in your
                browser. Your browser downloads them directly, so jsDelivr sees your IP address.
              </li>
              <li>
                <strong>GitHub</strong>, if you sign in with it or connect a repository: we read
                your public repository&apos;s workflow runs to confirm test results.
              </li>
              <li>
                <strong>The AI provider you choose</strong> (Anthropic, OpenAI or Google), only if
                you add your own key: when you ask the tutor or request a review, the drill or
                brief, your code or files and your question go to that provider under your key and
                its terms. When you ask the Sensei, your question, the conversation so far and the
                text of the page you&apos;re on go the same way. Conversations aren&apos;t stored by
                pylearn: the Sensei&apos;s chat stays in your browser until you close the tab.
              </li>
              <li>
                <strong>Vercel</strong> hosts the site, in the United States, and keeps standard
                request logs. When you sign up, sign in with a password or ask for an email, its
                BotID check looks at technical signals from your browser to confirm a person sent
                the request, not a script. It never sees your password, and we don&apos;t keep its
                answer.
              </li>
            </ul>
          </Section>

          <Section id="cookies" title="Cookies and your browser">
            <p>
              One cookie keeps you signed in. Your browser also keeps a few things locally, such as
              your theme and unsaved editor drafts. They never leave your device unless the page
              saves them to your account.
            </p>
          </Section>

          <Section id="keep" title="How long we keep it">
            <p>
              For as long as you have an account. When you delete it in{" "}
              <Link href="/settings" className="font-medium text-primary underline">
                Settings
              </Link>
              , your account and everything attached to it (progress, submissions, drafts, keys,
              logs) is deleted at once, along with the notices our admins got about it. Our
              admins&apos; record of actions on accounts keeps that an action happened, but no
              longer who it was about. Backups held by the database provider age out on its own
              schedule. If we remove an account for abuse, we may keep a one-way fingerprint of its
              email address (not the address) so it can&apos;t sign up again; accounts you delete
              yourself are never blocked.
            </p>
          </Section>

          <Section id="rights" title="Your rights and how to reach us">
            <p>
              You can see and change your details in Settings, delete your account there, and ask us
              for a copy of your data or anything else about this policy.{" "}
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
              If this policy changes in a way that matters, we&apos;ll say so on this page and, for
              big changes, by email.
            </p>
          </Section>
        </Part>
      </main>
      <SiteFooter />
    </>
  );
}
