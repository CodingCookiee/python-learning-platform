import { cn } from "@/lib/utils";
import { BeltKnot } from "@/components/brand/logo";
import { CERTIFICATE, formatIssued, type CertificateTrack } from "@/lib/certificate-rules";

/**
 * The certificate as a document: a grading certificate in the printed-syllabus world (DESIGN.md),
 * jade and straw on sheet paper, flat, with the app's own marks. Always paper, in either theme.
 *
 * One design, sized by its own width (a container query): from 42rem it's the A4-landscape
 * composition, every size in container units so it scales as one piece and prints at 297 × 210 mm;
 * narrower, it stacks at reading sizes so a phone can read it without scrolling sideways. Real text
 * in reading order (title, name, what was verified, date and ID); the belt, the numeral and the seal
 * are decoration the words already say.
 */
export function CertificateSheet({
  track,
  name,
  code,
  issuedAt,
  url,
  heading = "h1",
  stamp = "static",
  className,
}: {
  track: CertificateTrack;
  name: string;
  code: string;
  issuedAt: Date | string;
  /** The verification address printed in the foot */
  url: string;
  /** The title is the page's heading on the certificate page; a preview inside a dialog isn't one */
  heading?: "h1" | "p";
  /** The seal pressed as the certificate is issued (the claim dialog), or already there */
  stamp?: "static" | "animate" | "none";
  className?: string;
}) {
  const words = CERTIFICATE[track];
  const issued = new Date(issuedAt);
  const Title = heading;
  // A long name steps down a size so it never pushes the sheet past A4
  const nameSize =
    name.length <= 24
      ? "text-4xl @2xl:text-[5.4cqw]"
      : name.length <= 44
        ? "text-3xl @2xl:text-[4.3cqw]"
        : "text-2xl @2xl:text-[3.3cqw]";

  return (
    <article data-certificate-print aria-label={`${words.title}, certificate ${code}`} className={cn("paper @container", className)}>
      <div className="flex h-full flex-col border-2 border-(--keyline) bg-(--sheet) p-2 @2xl:aspect-[297/210] @2xl:border-[0.28cqw] @2xl:p-[1.5cqw] print:aspect-auto">
        {/* The inner rule, stitched like the belt */}
        <div className="flex flex-1 flex-col gap-6 border border-dashed border-(--keyline)/50 p-5 @2xl:justify-between @2xl:gap-0 @2xl:border-[0.14cqw] @2xl:px-[4.4cqw] @2xl:py-[3.2cqw]">
          <header className="flex flex-col gap-3 border-b border-(--keyline)/25 pb-5 @2xl:gap-[1.3cqw] @2xl:pb-[2.2cqw]">
            <span className="flex items-center gap-2 @2xl:gap-[0.8cqw]">
              <BeltKnot belt="black" className="size-7 @2xl:size-[3cqw]" />
              <span className="font-semicondensed text-xl leading-none font-bold tracking-[-0.03em] @2xl:text-[2.1cqw]">pylearn</span>
            </span>
            <Title className="font-condensed text-3xl leading-[0.95] font-extrabold tracking-[-0.02em] @2xl:text-[4.2cqw]">
              {words.title}
            </Title>
          </header>

          <div className="flex flex-col gap-6 @2xl:grid @2xl:grid-cols-[29%_1fr] @2xl:items-center @2xl:gap-[5cqw]">
            <div aria-hidden="true" className="flex flex-col gap-3 @2xl:gap-[1.6cqw]">
              <CertificateBelt track={track} />
              <p className="font-condensed tabular leading-[0.8]">
                <span className="text-7xl font-extrabold tracking-[-0.045em] @2xl:text-[11.5cqw]">{words.rank.numeral}</span>
                <span className="ml-1.5 text-3xl font-bold @2xl:ml-[0.9cqw] @2xl:text-[3.6cqw]">{words.rank.suffix}</span>
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-2 @2xl:gap-[1.1cqw]">
              <p className="text-base text-muted-foreground @2xl:text-[1.6cqw]">This certifies that</p>
              <p className={cn("font-condensed leading-[1.02] font-extrabold tracking-[-0.015em] text-balance wrap-break-word", nameSize)}>
                {name}
              </p>
              <p className="max-w-[44ch] text-base leading-relaxed @2xl:text-[1.65cqw] @2xl:leading-[1.45]">{words.statement}.</p>
            </div>
          </div>

          <footer className="flex flex-wrap items-end justify-between gap-5 border-t border-(--keyline)/25 pt-5 @2xl:gap-[2cqw] @2xl:pt-[2cqw]">
            <div className="flex min-w-0 flex-col gap-1 text-sm @2xl:gap-[0.45cqw] @2xl:text-[1.3cqw]">
              <p>
                Awarded by pylearn on <time dateTime={issued.toISOString().slice(0, 10)}>{formatIssued(issued)}</time>
              </p>
              <p>
                <span className="text-muted-foreground">ID </span>
                <span className="font-mono">{code}</span>
              </p>
              <p className="font-mono break-all text-muted-foreground">{url}</p>
            </div>
            {stamp !== "none" && <CertificateSeal detail={words.seal} animate={stamp === "animate"} />}
          </footer>
        </div>
      </div>
    </article>
  );
}

/**
 * The black belt, large: plain for the Python certificate; for the automation track, its rank bar in
 * seal jade with the eight straw dan stripes (2nd to 9th dan)
 */
function CertificateBelt({ track }: { track: CertificateTrack }) {
  return (
    <div
      className="belt-cloth flex h-7 items-stretch justify-end border border-(--keyline) bg-(--belt-black) @2xl:h-[3.2cqw] @2xl:border-[0.14cqw]"
      style={{ color: "var(--keyline)" }}
    >
      {track === "automation" && (
        <div className="flex items-stretch gap-[3px] bg-(--seal) px-1.5 py-1 @2xl:gap-[0.36cqw] @2xl:px-[0.6cqw] @2xl:py-[0.5cqw]">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="w-1 bg-highlight @2xl:w-[0.42cqw]" />
          ))}
        </div>
      )}
    </div>
  );
}

/** The examiner's seal, at the certificate's own scale, pressed into the lower right corner */
function CertificateSeal({ detail, animate }: { detail: string; animate: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "mr-1 mb-1 inline-flex shrink-0 rotate-[-7deg] flex-col items-center border-[3px] border-seal p-[3px] text-seal-ink @2xl:mr-[0.6cqw] @2xl:mb-[0.4cqw] @2xl:border-[0.32cqw] @2xl:p-[0.3cqw]",
        animate && "animate-seal-stamp"
      )}
    >
      <div className="flex flex-col items-center border border-seal px-3 py-1.5 @2xl:border-[0.12cqw] @2xl:px-[1.5cqw] @2xl:py-[0.8cqw]">
        <span className="font-condensed text-xl leading-none font-extrabold tracking-[0.06em] uppercase @2xl:text-[2.4cqw]">Certified</span>
        <span className="font-condensed mt-1 text-xs leading-none font-semibold tracking-[0.08em] uppercase @2xl:mt-[0.5cqw] @2xl:text-[1.05cqw]">
          {detail}
        </span>
      </div>
    </div>
  );
}
