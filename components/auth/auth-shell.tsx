import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BeltBand } from "@/components/brand/belt";
import { BELTS, kyuRange } from "@/lib/ranks";

/**
 * Two-panel auth layout: the belt ladder on the left, the form on the right.
 */
export function AuthShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="hidden flex-col justify-between border-r border-border bg-sheet p-12 lg:flex">
        <Link href="/" aria-label="pylearn home" className="w-fit rounded-sm">
          <Logo />
        </Link>

        <div className="flex max-w-md flex-col gap-10">
          <div className="flex flex-col gap-4">
            <p className="font-condensed text-6xl leading-[0.92] font-extrabold tracking-[-0.025em]">
              {title}
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">{lede}</p>
          </div>

          <ol className="flex flex-col gap-3" aria-label="Belt ranks">
            {BELTS.map((belt, i) => (
              <li key={belt.key} className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-4">
                <BeltBand belt={belt.key} className="h-4" />
                <span className={i === 0 ? "text-sm font-semibold" : "text-sm text-muted-foreground"}>
                  {belt.label}
                </span>
                <span className="font-condensed tabular text-sm text-muted-foreground">
                  {kyuRange(belt)}
                </span>
              </li>
            ))}
            <li className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-4">
              <BeltBand belt="black" className="h-4" />
              <span className="text-sm text-muted-foreground">Black belt</span>
              <span className="font-condensed text-sm text-muted-foreground">1st dan</span>
            </li>
          </ol>
        </div>

        <p className="text-sm text-muted-foreground">
          Python from first syntax to advanced, then AI automation.
        </p>
      </aside>

      <main className="flex flex-col px-6 py-8 sm:px-10">
        <Link href="/" aria-label="pylearn home" className="w-fit rounded-sm lg:hidden">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
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
