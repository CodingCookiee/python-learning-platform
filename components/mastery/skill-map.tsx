import Link from "next/link";
import { SealMark } from "@/components/brand/marks";
import { ordinal } from "@/lib/ranks";
import type { SkillMap as SkillMapData } from "@/lib/skill-map";

function pct(strength: number) {
  return Math.round(strength * 100);
}

/**
 * How firmly each open module and its common topics are held. Solving a drill
 * fills 40% of it; surviving spaced reviews fills the rest.
 */
export function SkillMap({ map }: { map: SkillMapData }) {
  if (map.modules.length === 0) return null;
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <ol className="flex flex-col border-t border-border">
        {map.modules.map((m) => (
          <li key={m.id} className="border-b border-border">
            <Link
              href={`/modules/${m.id}`}
              className="grid grid-cols-[3.25rem_minmax(0,1fr)_7rem_2.75rem] items-center gap-x-3 py-2.5 text-sm hover:text-primary"
            >
              <span className="font-condensed tabular text-muted-foreground">
                {m.grade === "dan" ? `${ordinal(m.order + 1)} dan` : m.grade === "none" ? "Start" : String(m.order).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <span className="truncate">{m.title}</span>
                {m.passed && <SealMark className="size-3.5 shrink-0 text-success" title="Passed" />}
              </span>
              <span
                className="h-1.5 overflow-hidden rounded-[2px] bg-muted"
                role="img"
                aria-label={`${pct(m.strength)}% held, ${m.solved} of ${m.drills} drills solved`}
              >
                <span className="block h-full bg-primary" style={{ width: `${pct(m.strength)}%` }} />
              </span>
              <span className="font-condensed tabular text-right text-muted-foreground">{pct(m.strength)}%</span>
            </Link>
          </li>
        ))}
      </ol>

      {map.tags.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Topics across your open modules, strongest first. Solving a drill fills 40%; each review it survives fills
            more.
          </p>
          <ul className="flex flex-wrap gap-2" role="list">
            {map.tags.map((t) => (
              <li
                key={t.tag}
                className="rounded-sm border border-border px-2 py-1 text-sm"
                style={{
                  background: `color-mix(in oklab, var(--primary) ${Math.round(t.strength * 32)}%, transparent)`,
                }}
                title={`${pct(t.strength)}% held across ${t.drills} drills`}
              >
                {t.tag}
                <span className="font-condensed tabular ml-1.5 text-xs text-muted-foreground">{pct(t.strength)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
