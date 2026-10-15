import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LockedMark, SealMark } from "@/components/brand/marks";
import { ClaimCertificate } from "@/components/certificates/claim-certificate";
import { CERTIFICATE, formatIssued } from "@/lib/certificate-rules";
import type { CertificateState } from "@/lib/certificates";

/**
 * The profile's certificates, as ruled rows: each one issued (its page and ID), ready to claim, or
 * what's still to do for it in a line
 */
export function CertificatesSection({
  states,
  defaultName,
  origin,
}: {
  states: CertificateState[];
  defaultName: string;
  origin: string;
}) {
  return (
    <section aria-labelledby="certificates-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="certificates-heading" className="text-xl font-semibold">
          Certificates
        </h2>
        <p className="text-sm text-muted-foreground">
          A credential to share, with its own page anyone can check: one for the black belt, one for the AI automation
          track.
        </p>
      </div>
      <ul className="flex flex-col border-t border-border">
        {states.map((s) => {
          const words = CERTIFICATE[s.track];
          return (
            <li key={s.track} className="flex flex-col gap-3 border-b border-border py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="flex min-w-0 items-start gap-3">
                {s.state === "not-yet" ? (
                  <LockedMark className="mt-0.5 size-5 text-muted-foreground" />
                ) : (
                  <SealMark className="mt-0.5 size-5 text-primary" />
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold">{words.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {s.state === "issued" ? (
                      <>
                        Issued {formatIssued(s.certificate.issuedAt)} · ID <span className="font-mono">{s.certificate.code}</span>
                        {s.certificate.revokedAt
                          ? " · revoked by pylearn"
                          : s.certificate.withdrawnAt && " · public page withdrawn"}
                      </>
                    ) : s.state === "ready" ? (
                      "Earned. Claim it for its page, a PDF and an image to share."
                    ) : (
                      s.left
                    )}
                  </span>
                </div>
              </div>
              {s.state === "issued" && s.certificate.revokedAt ? null : s.state === "issued" ? (
                <Button variant="outline" asChild className="w-fit shrink-0">
                  <Link href={`/certificates/${s.certificate.code}`}>
                    View certificate
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
              ) : s.state === "ready" ? (
                <ClaimCertificate track={s.track} defaultName={defaultName} origin={origin} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
