/**
 * Tokens per day as bars: one series, so no legend (the heading names it). Each
 * bar has a hover and focus tooltip with the exact numbers, and the same data is
 * available as a table below the chart.
 */

const fmt = (n: number) => n.toLocaleString();

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

function label(day: string, withMonth = false): string {
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString([], withMonth ? { month: "short", day: "numeric" } : { day: "numeric" });
}

export function UsageChart({ daily }: { daily: Array<{ day: string; calls: number; tokens: number }> }) {
  const max = Math.max(1, ...daily.map((d) => d.tokens));
  // A tidy top for the scale: 1, 2 or 5 times a power of ten
  const pow = 10 ** Math.floor(Math.log10(max));
  const top = [1, 2, 5, 10].map((m) => m * pow).find((v) => v >= max) ?? max;
  const empty = daily.every((d) => d.tokens === 0);

  return (
    <figure className="flex flex-col gap-3">
      <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2">
        {/* Y axis: recessive, three reference lines */}
        <div className="font-condensed tabular relative h-48 text-right text-xs text-muted-foreground" aria-hidden="true">
          <span className="absolute top-0 right-0 -translate-y-1/2">{compact(top)}</span>
          <span className="absolute top-1/2 right-0 -translate-y-1/2">{compact(top / 2)}</span>
          <span className="absolute right-0 bottom-0 translate-y-1/2">0</span>
        </div>
        <div className="relative h-48">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            <span className="border-t border-dashed border-border" />
            <span className="border-t border-dashed border-border" />
            <span className="border-t border-(--keyline)/60" />
          </div>
          {empty && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No AI calls in this window yet.
            </p>
          )}
          <ol className="relative flex h-full items-end gap-[2px]" aria-label="Tokens per day">
            {daily.map((d) => (
              <li
                key={d.day}
                tabIndex={0}
                aria-label={`${label(d.day, true)}: ${fmt(d.tokens)} tokens, ${fmt(d.calls)} calls`}
                className="group relative flex h-full flex-1 items-end outline-none"
              >
                <span
                  className="block w-full rounded-t-[4px] bg-(--chart-bar) transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
                  style={{ height: d.tokens > 0 ? `max(2px, ${(d.tokens / top) * 100}%)` : 0 }}
                />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-sm group-hover:block group-focus-visible:block"
                >
                  <span className="block font-semibold">{label(d.day, true)}</span>
                  <span className="font-condensed tabular block">
                    {fmt(d.tokens)} tokens · {fmt(d.calls)} {d.calls === 1 ? "call" : "calls"}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <span />
        <div className="font-condensed tabular mt-1.5 flex justify-between text-xs text-muted-foreground" aria-hidden="true">
          <span>{label(daily[0]!.day, true)}</span>
          <span>{label(daily[Math.floor(daily.length / 2)]!.day, true)}</span>
          <span>{label(daily.at(-1)!.day, true)}</span>
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show as a table</summary>
        <table className="mt-2 w-full max-w-md text-left">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 text-right font-medium">Calls</th>
              <th className="py-1 text-right font-medium">Tokens</th>
            </tr>
          </thead>
          <tbody className="font-condensed tabular">
            {daily
              .filter((d) => d.calls > 0)
              .map((d) => (
                <tr key={d.day} className="border-t border-border">
                  <td className="py-1">{label(d.day, true)}</td>
                  <td className="py-1 text-right">{fmt(d.calls)}</td>
                  <td className="py-1 text-right">{fmt(d.tokens)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
