import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/api-auth";
import { getAiUsageReport, type UsageTotals } from "@/lib/ai/usage-report";
import { DAILY_CALL_LIMIT } from "@/lib/ai/credentials";
import { PROVIDER_LABEL, type Provider } from "@/lib/ai/gateway";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { AdminHeader } from "@/components/admin/admin-header";
import { UsageChart } from "@/components/admin/usage-chart";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "AI usage (admin)" };

const FEATURE: Record<string, string> = {
  tutor: "Drill tutor",
  explain: "Explain this error",
  review: "Capstone review",
  test: "Key test",
};

const RANGES = [7, 30, 90];
const fmt = (n: number) => n.toLocaleString();
const tokens = (t: UsageTotals) => t.input + t.output;

function Stat({ value, label, detail }: { value: string; label: string; detail?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-5 md:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-condensed tabular text-4xl leading-none font-extrabold tracking-[-0.02em]">{value}</dd>
      {detail && <dd className="text-xs text-muted-foreground">{detail}</dd>}
    </div>
  );
}

function UsageTable<T extends UsageTotals>({
  caption,
  rows,
  name,
}: {
  caption: string;
  rows: T[];
  name: (row: T) => React.ReactNode;
}) {
  return (
    <table className="w-full text-left text-sm">
      <caption className="mb-2 text-left text-base font-semibold">{caption}</caption>
      <thead className="text-xs text-muted-foreground">
        <tr className="border-b border-border">
          <th className="py-2 font-medium">Name</th>
          <th className="py-2 text-right font-medium">Calls</th>
          <th className="py-2 text-right font-medium">Tokens in</th>
          <th className="py-2 text-right font-medium">Out</th>
          <th className="hidden py-2 text-right font-medium sm:table-cell">Cached</th>
        </tr>
      </thead>
      <tbody className="font-condensed tabular">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={5} className="py-3 font-sans text-muted-foreground">
              Nothing yet.
            </td>
          </tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i} className="border-b border-border">
              <td className="py-2 pr-3 font-sans [font-variation-settings:normal]">{name(r)}</td>
              <td className="py-2 text-right">{fmt(r.calls)}</td>
              <td className="py-2 text-right">{fmt(r.input)}</td>
              <td className="py-2 text-right">{fmt(r.output)}</td>
              <td className="hidden py-2 text-right text-muted-foreground sm:table-cell">{fmt(r.cached)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export default async function AdminAiPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");
  if (!(await isAdmin(userId))) redirect("/dashboard");

  const requested = Number((await searchParams).days);
  const days = RANGES.includes(requested) ? requested : 30;
  const report = await getAiUsageReport(days);
  const activeLearners = report.learners.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-10">
        <FadeIn>
          <AdminHeader
            active="ai"
            title="AI usage"
            description="Every tutor, error-explainer and capstone-review call, on learners' own keys. Learners pay their providers directly, so this counts tokens rather than dollars."
          />
        </FadeIn>

        <FadeIn delay={0.03}>
          <nav aria-label="Time range" className="flex gap-2">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/admin/ai?days=${r}`}
                aria-current={r === days ? "page" : undefined}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium",
                  r === days ? "border-primary bg-accent/60" : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                Last {r} days
              </Link>
            ))}
          </nav>
        </FadeIn>

        <FadeIn delay={0.05}>
          <dl className="grid gap-x-10 border-y border-border md:grid-cols-4">
            <Stat value={fmt(report.totals.calls)} label={`Calls, last ${days} days`} detail={`${fmt(report.today.calls)} today`} />
            <Stat
              value={fmt(tokens(report.totals))}
              label="Tokens"
              detail={`${fmt(report.totals.input)} in · ${fmt(report.totals.output)} out`}
            />
            <Stat
              value={report.totals.input > 0 ? `${Math.round((report.totals.cached / report.totals.input) * 100)}%` : "–"}
              label="Input served from cache"
              detail="Anthropic prompt caching on drill context"
            />
            <Stat
              value={fmt(report.keys.total)}
              label="Learners with a key"
              detail={
                report.keys.byProvider.map((k) => `${PROVIDER_LABEL[k.provider as Provider] ?? k.provider} ${k.count}`).join(" · ") ||
                "None yet"
              }
            />
          </dl>
        </FadeIn>

        <FadeIn delay={0.07}>
          <section aria-labelledby="daily-heading" className="flex flex-col gap-4">
            <h2 id="daily-heading" className="text-xl font-semibold">
              Tokens per day
            </h2>
            <UsageChart daily={report.daily} />
          </section>
        </FadeIn>

        <FadeIn delay={0.09}>
          <div className="grid gap-10 lg:grid-cols-2">
            <UsageTable caption="By feature" rows={report.byFeature} name={(r) => FEATURE[r.feature] ?? r.feature} />
            <UsageTable
              caption="By model"
              rows={report.byModel}
              name={(r) => (
                <span>
                  <span className="font-mono text-[0.8125rem]">{r.model}</span>
                  <span className="text-muted-foreground"> · {PROVIDER_LABEL[r.provider as Provider] ?? r.provider}</span>
                </span>
              )}
            />
          </div>
        </FadeIn>

        <FadeIn delay={0.11}>
          <div className="flex flex-col gap-2">
            <UsageTable
              caption={`Top learners by tokens (${activeLearners} used AI in this window)`}
              rows={report.learners}
              name={(r) => (
                <span className="flex flex-col">
                  <span>{r.name ?? r.email}</span>
                  {r.name && <span className="text-xs text-muted-foreground">{r.email}</span>}
                </span>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Each learner can make {DAILY_CALL_LIMIT} AI calls a day across all features.
            </p>
          </div>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
