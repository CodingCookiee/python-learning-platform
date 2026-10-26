import Link from "next/link";
import { Skeleton } from "@/components/animations";
import { Logo } from "@/components/brand/logo";
import { PageLoading } from "@/components/layout/page-loading";

/**
 * The loading screen for a certificate: the site's bar, then a sheet the certificate's shape (A4
 * landscape on wide screens) and the plain line under it. Anyone can open these, often from a link
 * someone shared, so the page says what's coming while the record is checked.
 */
export default function CertificateLoading() {
  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-gutter">
          <Link href="/" aria-label="pylearn home" className="rounded-sm">
            <Logo />
          </Link>
        </div>
      </header>
      <PageLoading label="Checking the certificate" className="max-w-6xl sm:py-10">
        <div className="flex flex-col gap-6">
          <Skeleton className="aspect-[4/5] w-full rounded-sm sm:aspect-[297/210]" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
      </PageLoading>
    </>
  );
}
