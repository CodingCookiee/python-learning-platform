import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/**
 * An unknown code and a withdrawn certificate look the same to everyone but the holder: one neutral
 * notice, no name, so the page never says whether a certificate was there.
 */
export default function CertificateNotFound() {
  return (
    <main id="content" className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-4 py-16 sm:px-6">
      <Link href="/" aria-label="pylearn home" className="w-fit rounded-sm">
        <Logo />
      </Link>
      <h1 className="font-condensed text-4xl leading-[0.95] font-extrabold tracking-[-0.02em]">No certificate here</h1>
      <p className="text-lg leading-relaxed text-muted-foreground">
        The link may be mistyped, or its holder has withdrawn the certificate&apos;s public page. Check the ID with the
        person who shared it.
      </p>
      <Button variant="outline" asChild className="w-fit">
        <Link href="/">What is pylearn?</Link>
      </Button>
    </main>
  );
}
