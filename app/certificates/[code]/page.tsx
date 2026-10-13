import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/landing/site-chrome";
import { SkipLink } from "@/components/layout/skip-link";
import { CertificateSheet } from "@/components/certificates/certificate-sheet";
import { HolderControls } from "@/components/certificates/holder-controls";
import { getCertificateForViewer } from "@/lib/certificates";
import { CERTIFICATE, formatIssued, linkedInAddUrl, normaliseCode } from "@/lib/certificate-rules";
import { publicOrigin } from "@/lib/public-origin";

type Params = { params: Promise<{ code: string }> };

/** The certificate and whether the viewer holds it; a withdrawn one only for its holder (lib/certificates.ts) */
const load = cache(async (raw: string) => {
  const code = normaliseCode(raw);
  if (!code) return null;
  const session = await auth();
  const found = await getCertificateForViewer(code, session?.user?.id ?? null);
  return found ? { ...found, signedIn: Boolean(session?.user) } : null;
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await load((await params).code);
  // Certificates stay out of search engines: a learner's name is theirs to share, not to be indexed
  const robots = { index: false, follow: false };
  if (!found) return { title: "No certificate here", robots };
  const { certificate: c } = found;
  const words = CERTIFICATE[c.track];
  // The page title names the PDF the browser saves: "Grace Hopper, pylearn Black belt in Python"
  const title = `${c.name}, pylearn ${words.name}`;
  const description = `${c.name} ${words.statement}. Awarded by pylearn on ${formatIssued(c.issuedAt)}. ID ${c.code}.`;
  const image = { url: `/certificates/${c.code}/image`, width: 1600, height: 1131, alt: `${words.title} certificate for ${c.name}` };
  return {
    title: { absolute: title },
    description,
    robots,
    alternates: { canonical: `/certificates/${c.code}` },
    openGraph: { type: "article", title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function CertificatePage({ params }: Params) {
  const found = await load((await params).code);
  if (!found) notFound();
  const { certificate: c, holder, signedIn } = found;
  const words = CERTIFICATE[c.track];
  const url = `${publicOrigin()}/certificates/${c.code}`;
  const issued = formatIssued(c.issuedAt);

  return (
    <>
      <div className="print:hidden">
        <SkipLink href="#certificate">Skip to the certificate</SkipLink>
        <header className="border-b border-border bg-background">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
            <Link href="/" aria-label="pylearn home" className="rounded-sm">
              <Logo />
            </Link>
            {signedIn ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile">Your profile</Link>
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href="/">What is pylearn?</Link>
              </Button>
            )}
          </div>
        </header>
      </div>

      <main
        id="certificate"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 outline-none sm:px-6 lg:px-8 print:m-0 print:block print:max-w-none print:p-0"
      >
        {c.withdrawnAt && holder && (
          <p role="status" className="rounded-md border border-dashed border-border bg-sheet px-4 py-3 text-sm print:hidden">
            <span className="font-semibold">Withdrawn.</span> Only you can see this page. Anyone else following the link is
            told there&apos;s no certificate here, until you restore it.
          </p>
        )}

        <CertificateSheet track={c.track} name={c.name} code={c.code} issuedAt={c.issuedAt} url={url} />

        {/* The same facts as one plain line, to read or copy, under the sheet */}
        <p className="text-sm text-muted-foreground print:hidden">
          Issued by pylearn to {c.name} on {issued} · ID <span className="font-mono">{c.code}</span> · {url}
        </p>

        {holder && (
          <HolderControls
            code={c.code}
            name={c.name}
            title={words.title}
            url={url}
            withdrawn={c.withdrawnAt !== null}
            linkedIn={linkedInAddUrl(c, url)}
          />
        )}
      </main>

      <div className="print:hidden">
        <SiteFooter />
      </div>
    </>
  );
}
