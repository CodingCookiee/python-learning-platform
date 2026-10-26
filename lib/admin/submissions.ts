import { prisma } from "@/lib/prisma";

export interface EvaluationListItem {
  id: string;
  status: string;
  submittedAt: string;
  project: {
    id: string;
    title: string;
    moduleTitle: string;
  };
  submitter: {
    id: string;
    name: string | null;
    email: string;
  };
  /** How the work was handed in, and how many files when uploaded */
  via: "files" | "github";
  fileCount: number;
}

/** The most the queue shows at once, oldest first; the header gives the full count */
export const QUEUE_PAGE = 100;

/**
 * Capstone submissions waiting for an examiner, oldest first. Only what the list shows: the uploaded
 * files stay in the database (Postgres reads the stored JSON for how it came in and how many files),
 * so a queue of large uploads can't outgrow a response or the page.
 */
export async function listPendingSubmissions({ take = QUEUE_PAGE }: { take?: number } = {}): Promise<{
  rows: EvaluationListItem[];
  total: number;
}> {
  const [rows, total] = await Promise.all([
    prisma.$queryRaw<
      {
        id: string;
        status: string;
        submittedAt: Date;
        userId: string;
        projectId: string;
        projectTitle: string;
        moduleTitle: string;
        via: string | null;
        fileCount: number;
      }[]
    >`
      SELECT s."id", s."status", s."submittedAt", s."userId", s."projectId",
             p."title" AS "projectTitle", m."title" AS "moduleTitle",
             (s."files"::jsonb ->> 'type') AS "via",
             CASE WHEN jsonb_typeof(s."files"::jsonb -> 'files') = 'array'
                  THEN jsonb_array_length(s."files"::jsonb -> 'files') ELSE 0 END::int AS "fileCount"
      FROM "project_submissions" s
      JOIN "projects" p ON p."id" = s."projectId"
      JOIN "modules" m ON m."id" = p."moduleId"
      WHERE s."status" = 'pending'
      ORDER BY s."submittedAt" ASC
      LIMIT ${take}
    `,
    prisma.projectSubmission.count({ where: { status: "pending" } }),
  ]);

  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(rows.map((s) => s.userId))] } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    total,
    rows: rows.map((s) => {
      const user = userMap.get(s.userId);
      return {
        id: s.id,
        status: s.status,
        submittedAt: s.submittedAt.toISOString(),
        project: { id: s.projectId, title: s.projectTitle, moduleTitle: s.moduleTitle },
        submitter: { id: s.userId, name: user?.name ?? null, email: user?.email ?? "" },
        via: s.via === "github" ? "github" : "files",
        fileCount: s.fileCount,
      };
    }),
  };
}
