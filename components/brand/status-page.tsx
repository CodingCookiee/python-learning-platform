import Link from "next/link";
import { BeltBand } from "@/components/brand/belt";
import { Button } from "@/components/ui/button";

/**
 * Full-height status screen for 404s and errors: a big condensed code, a
 * plain-language line, and the ways back. The loose belt is the one image.
 */
export function StatusPage({
  code,
  title,
  message,
  actions,
}: {
  code: string;
  title: string;
  message: string;
  actions: Array<{ label: string; href?: string; onClick?: () => void; variant?: "default" | "outline" }>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-20 sm:px-6">
      <div className="flex flex-col gap-6">
        <span className="font-condensed tabular text-[clamp(5rem,16vw,9rem)] leading-[0.8] font-extrabold tracking-[-0.035em] text-muted-foreground/40">
          {code}
        </span>
        <BeltBand belt="white" slots={3} filled={0} className="h-4 w-48" />
        <h1 className="font-condensed text-4xl leading-none font-extrabold tracking-[-0.02em] sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">{message}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {actions.map((a) =>
          a.href ? (
            <Button key={a.label} asChild size="lg" variant={a.variant ?? "default"}>
              <Link href={a.href}>{a.label}</Link>
            </Button>
          ) : (
            <Button key={a.label} size="lg" variant={a.variant ?? "default"} onClick={a.onClick}>
              {a.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
