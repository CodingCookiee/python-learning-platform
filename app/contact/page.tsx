import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { SkipLink } from "@/components/layout/skip-link";
import { publicOrigin } from "@/lib/public-origin";

export const metadata: Metadata = {
  title: "Contact pylearn: accounts, lessons and certificates",
  description:
    "How to reach pylearn about your account, a mistake in a lesson or drill, a capstone, a certificate, or your data, and what to include so it can be answered quickly.",
  alternates: { canonical: "/contact" },
};

/**
 * /contact: the one address to write to (CONTACT_EMAIL, as the privacy policy uses; never hard-coded),
 * and what to put in the message. No form, so nothing to spam.
 */
export default async function ContactPage() {
  const contact = process.env.CONTACT_EMAIL;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const origin = publicOrigin();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${origin}/contact`,
    url: `${origin}/contact`,
    name: "Contact pylearn",
    about: { "@id": `${origin}/#organization` },
    ...(contact ? { mainEntity: { "@type": "ContactPoint", contactType: "customer support", email: contact } } : {}),
  };

  return (
    <>
      <SkipLink href="#contact">Skip to the page</SkipLink>
      <SiteHeader />
      <main id="contact" tabIndex={-1} className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12 outline-none sm:px-6">
        <header className="flex flex-col gap-3 border-b border-border pb-8">
          <h1 className="font-condensed text-5xl leading-[0.95] font-extrabold tracking-[-0.02em]">Contact</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {contact ? (
              <>
                Write to{" "}
                <a href={`mailto:${contact}`} className="font-medium text-primary underline">
                  {contact}
                </a>
                . A person reads every message.
              </>
            ) : (
              <>Reply to any email pylearn has sent you, and it reaches a person.</>
            )}
          </p>
        </header>

        <section aria-labelledby="include-heading" className="flex flex-col gap-3">
          <h2 id="include-heading" className="text-2xl font-semibold tracking-[-0.01em]">
            What to include
          </h2>
          <ul className="flex flex-col gap-2 leading-relaxed [&_li]:ml-5 [&_li]:list-disc">
            <li>
              <strong>Your account:</strong> the email you signed up with. Never send your password; nobody at pylearn will
              ask for it.
            </li>
            <li>
              <strong>A mistake in a lesson or drill:</strong> its title or the page&apos;s address, and what you expected
              instead.
            </li>
            <li>
              <strong>A capstone:</strong> the project&apos;s name and when you handed it in.
            </li>
            <li>
              <strong>A certificate:</strong> its ID (PL-PY-… or PL-AI-…). Anyone can check a certificate on its own page;
              see <Link href="/about#certificates" className="font-medium text-primary underline">how to check one</Link>.
            </li>
          </ul>
        </section>

        <section aria-labelledby="self-heading" className="flex flex-col gap-3">
          <h2 id="self-heading" className="text-2xl font-semibold tracking-[-0.01em]">
            Things you can do yourself
          </h2>
          <ul className="flex flex-col gap-2 leading-relaxed [&_li]:ml-5 [&_li]:list-disc">
            <li>
              Change your name or password, add an AI key, or delete your account in{" "}
              <Link href="/settings" className="font-medium text-primary underline">Settings</Link>.
            </li>
            <li>
              Forgot your password? <Link href="/auth/forgot-password" className="font-medium text-primary underline">Reset it</Link>.
            </li>
            <li>
              How rank, capstones and certificates work is on the{" "}
              <Link href="/about" className="font-medium text-primary underline">About page</Link>; what pylearn keeps about
              you is in the <Link href="/privacy" className="font-medium text-primary underline">privacy policy</Link>.
            </li>
          </ul>
        </section>
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
