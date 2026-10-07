import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentWeek, getPastWeeks } from "@/lib/learning-log";
import { formatCheckIn } from "@/lib/learning-log-format";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn } from "@/components/animations";
import { CheckInForm, CopyCheckIn } from "@/components/log/check-in-form";

export const metadata: Metadata = { title: "Learning log" };

function weekLabel(iso: string): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const f = (d: Date) => d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${f(start)} – ${f(end)}`;
}

export default async function LogPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const [current, past] = await Promise.all([getCurrentWeek(session.user.id), getPastWeeks(session.user.id)]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Learning log" }]} />
        </FadeIn>
        <FadeIn delay={0.03}>
          <header className="flex flex-col gap-3 border-b border-border pb-8">
            <p className="text-sm font-semibold text-primary">
              Week {current.week} · {weekLabel(current.weekOf)}
            </p>
            <h1 className="font-condensed text-5xl leading-[0.95] font-extrabold tracking-[-0.02em]">Learning log</h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              A short check-in each week: what you built, what clicked, where you got stuck, and what&apos;s next. It&apos;s
              drafted from what you did here; make it yours, then save it.
            </p>
            <p className="text-sm text-muted-foreground">Now: {current.phase}</p>
          </header>
        </FadeIn>

        <FadeIn delay={0.05}>
          <CheckInForm initial={current} />
        </FadeIn>

        {past.length > 0 && (
          <FadeIn delay={0.08}>
            <section aria-labelledby="past-heading" className="flex flex-col gap-4">
              <h2 id="past-heading" className="text-xl font-semibold">
                Earlier weeks
              </h2>
              <ol className="flex flex-col border-t border-border">
                {past.map((w) => {
                  const text = formatCheckIn(w);
                  return (
                    <li key={w.weekOf} className="border-b border-border py-4">
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-baseline gap-x-4 gap-y-1 [&::-webkit-details-marker]:hidden">
                          <span className="font-condensed tabular font-bold">Week {w.week}</span>
                          <span className="text-sm text-muted-foreground">{weekLabel(w.weekOf)}</span>
                          <span className="font-condensed tabular text-sm text-muted-foreground">{w.hours} h</span>
                          <span className="min-w-0 flex-1 truncate text-sm">{w.built.split("\n")[0] || w.phase}</span>
                        </summary>
                        <div className="mt-3 flex flex-col gap-2">
                          <pre className="overflow-x-auto rounded-md border border-border bg-sheet p-4 font-mono text-[0.8125rem] leading-6 whitespace-pre-wrap">
                            {text}
                          </pre>
                          <div>
                            <CopyCheckIn text={text} label="Copy" />
                          </div>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ol>
            </section>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
