import Link from "next/link";

export interface TrackTableData {
  id: string;
  slug: string;
  title: string;
  summary: string;
  modules: Array<{
    id: string;
    order: number;
    title: string;
    summary: string;
    lessons: number;
    drills: number;
    capstones: number;
  }>;
}

/** One track's live modules as a ruled, read-only table. */
export function TrackTable({ track }: { track: TrackTableData }) {
  const headingId = `track-${track.slug}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-xl font-semibold">
          {track.title}{" "}
          <span className="font-condensed tabular text-muted-foreground">{track.modules.length}</span>
        </h2>
        {track.summary && <p className="max-w-2xl text-sm text-muted-foreground">{track.summary}</p>}
      </div>

      {track.modules.length === 0 ? (
        <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          No modules in this track yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-sm text-muted-foreground">
                <th scope="col" className="w-12 py-2.5 pr-3 font-medium">
                  #
                </th>
                <th scope="col" className="py-2.5 pr-4 font-medium">
                  Module
                </th>
                <th scope="col" className="w-24 py-2.5 pr-4 text-right font-medium">
                  Lessons
                </th>
                <th scope="col" className="w-24 py-2.5 pr-4 text-right font-medium">
                  Drills
                </th>
                <th scope="col" className="w-24 py-2.5 text-right font-medium">
                  Capstones
                </th>
              </tr>
            </thead>
            <tbody>
              {track.modules.map((mod) => (
                <tr key={mod.id} className="border-b border-border align-top">
                  <td className="font-condensed tabular py-4 pr-3 text-lg font-bold text-muted-foreground">
                    {String(mod.order).padStart(2, "0")}
                  </td>
                  <td className="py-4 pr-4">
                    <span className="flex flex-col gap-1">
                      <Link href={`/modules/${mod.id}`} className="font-semibold hover:underline">
                        {mod.title}
                      </Link>
                      {mod.summary && (
                        <span className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                          {mod.summary}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="font-condensed tabular py-4 pr-4 text-right">
                    {mod.lessons}
                  </td>
                  <td className="font-condensed tabular py-4 pr-4 text-right">
                    {mod.drills}
                  </td>
                  <td className="font-condensed tabular py-4 text-right">
                    {mod.capstones}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
