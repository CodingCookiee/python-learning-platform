import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BeltBand } from "@/components/brand/belt";
import { BELTS, kyuRange } from "@/lib/ranks";
import { SkipLink } from "@/components/layout/skip-link";
import { ResetSigningOut } from "@/components/layout/sign-out";
import { cn } from "@/lib/utils";

/** The auth pages' heading style: condensed, like every page title on the site */
export const AUTH_HEADING = "font-condensed text-4xl leading-[0.95] font-extrabold tracking-[-0.02em] text-balance";

/**
 * Where the two columns' content starts, shared so the statement on the left and the form's heading
 * on the right begin on one line. Hung from it rather than centred: a message appearing in the form
 * only extends it downward, so nothing jumps.
 */
const CONTENT_TOP = "pt-10 lg:pt-[clamp(1.5rem,calc(10vh-1.25rem),6rem)]";

/**
 * Two-panel auth layout on one grid: the belt ladder on the left, the form on the right. Both
 * columns have the same three rows: the logo along the top, the content from one shared line, and
 * the foot lines on one baseline. The way to the other auth page sits under the form, where people
 * look once they find they're on the wrong one (the convention of Google, GitHub and Stripe).
 *
 * The form is what the page is for, so it leads: its column is the wider one and sits on the
 * lighter Sheet, with the inputs set into it on the ground tone. The left column steps back onto
 * the ground, in smaller type, as context.
 */
export function AuthShell({
  title,
  lede,
  heading,
  sub,
  switchTo,
  children,
}: {
  /** The left column's statement */
  title: string;
  lede: string;
  /** The form's heading (a page whose form draws its own, like confirming an email, leaves it out) */
  heading?: string;
  sub?: React.ReactNode;
  /** The other way in, under the form: "Already training? Sign in" */
  switchTo?: { prompt?: string; label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-sheet lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <SkipLink href="#auth-main">Skip to the form</SkipLink>
      {/* A sign-out that ended in this tab is over: the account menu starts fresh next time */}
      <ResetSigningOut />
      <aside className="hidden grid-rows-[auto_1fr_auto] border-r border-border bg-background px-12 py-8 lg:grid">
        <Link href="/" aria-label="pylearn home" className="flex h-9 w-fit items-center rounded-sm">
          <Logo />
        </Link>

        <div className={cn("flex max-w-sm flex-col gap-9", CONTENT_TOP)}>
          <div className="flex flex-col gap-3">
            <p className="font-condensed text-[2.75rem] leading-[0.95] font-extrabold tracking-[-0.02em] text-foreground/85">
              {title}
            </p>
            <p className="leading-relaxed text-muted-foreground">{lede}</p>
          </div>

          <ol className="flex flex-col gap-2.5" aria-label="Belt ranks">
            {BELTS.map((belt, i) => (
              <li key={belt.key} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-4">
                <BeltBand belt={belt.key} className="h-3" />
                <span className={i === 0 ? "text-sm font-semibold" : "text-sm text-muted-foreground"}>
                  {belt.label}
                </span>
                <span className="font-condensed tabular text-sm text-muted-foreground">
                  {kyuRange(belt)}
                </span>
              </li>
            ))}
            <li className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-4">
              <BeltBand belt="black" className="h-3" />
              <span className="text-sm text-muted-foreground">Black belt</span>
              <span className="font-condensed text-sm text-muted-foreground">1st dan</span>
            </li>
          </ol>
        </div>

        <p className="pt-6 text-sm text-muted-foreground">
          Python from first syntax to advanced, then AI automation.
        </p>
      </aside>

      <main
        id="auth-main"
        tabIndex={-1}
        // Inputs sit into the Sheet on the ground tone, like wells in the page
        className="grid grid-rows-[auto_1fr_auto] px-6 py-8 outline-none sm:px-10 lg:px-12 [&_[data-slot=input]]:bg-background"
      >
        {/* Keeps the top row, so both columns' content starts on one line; the logo shows here on phones */}
        <div className="flex h-9 items-center">
          <Link href="/" aria-label="pylearn home" className="w-fit rounded-sm lg:hidden">
            <Logo />
          </Link>
        </div>

        <div className={cn("flex justify-center pb-6", CONTENT_TOP)}>
          <div className="flex w-full max-w-md flex-col gap-6">
            {heading && (
              <div className="flex flex-col gap-2">
                <h1 className={AUTH_HEADING}>{heading}</h1>
                {sub && <p className="text-sm leading-relaxed text-muted-foreground">{sub}</p>}
              </div>
            )}
            {children}
            {switchTo && (
              <p className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
                {switchTo.prompt && <>{switchTo.prompt} </>}
                <Link href={switchTo.href} className="font-medium text-primary underline underline-offset-2">
                  {switchTo.label}
                </Link>
              </p>
            )}
          </div>
        </div>

        <p className="pt-6 text-sm text-muted-foreground lg:text-right">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy and terms
          </Link>
        </p>
      </main>
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-sm border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

/**
 * Every field keeps a line under it for its hint or its error, so a message appearing or clearing
 * never changes the form's height: nothing jumps while the learner fills it in.
 */
export function FieldNote({
  id,
  error,
  hint,
  lines = 1,
  className,
}: {
  id: string;
  error?: string;
  hint?: string;
  lines?: 1 | 2;
  className?: string;
}) {
  return (
    <p
      id={id}
      className={cn(
        "text-sm leading-5",
        lines === 2 ? "min-h-10" : "min-h-5",
        error ? "text-destructive" : "text-muted-foreground",
        className
      )}
    >
      {error ?? hint}
    </p>
  );
}
