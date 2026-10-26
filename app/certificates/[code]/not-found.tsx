import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { StatusPage } from "@/components/brand/status-page";

/**
 * An unknown code and a withdrawn certificate look the same to everyone but the holder: one neutral
 * notice, no name, so the page never says whether a certificate was there.
 */
export default function CertificateNotFound() {
  return (
    <main id="content" className="flex min-h-dvh flex-col">
      <div className="mx-auto flex h-16 w-full max-w-page items-center px-gutter">
        <Link href="/" aria-label="pylearn home" className="w-fit rounded-sm">
          <Logo />
        </Link>
      </div>
      <StatusPage
        code="404"
        title="No certificate here."
        message="The link may be mistyped, or its holder has withdrawn the certificate's public page. Check the ID with the person who shared it."
        actions={[{ label: "What is pylearn?", href: "/" }]}
      />
    </main>
  );
}
