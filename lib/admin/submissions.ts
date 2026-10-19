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
  filesPayload: {
    type: "files" | "github";
    url?: string;
    files?: Array<{ name: string; size: number; type: string; content?: string }>;
    notes?: string | null;
  };
}

/** Capstone submissions waiting for an examiner, oldest first */
export async function listPendingSubmissions(): Promise<EvaluationListItem[]> {
  const submissions = await prisma.projectSubmission.findMany({
    where: { status: "pending" },
    orderBy: { submittedAt: "asc" },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      files: true,
      userId: true,
      project: {
        select: {
          id: true,
          title: true,
          module: { select: { title: true } },
        },
      },
    },
  });

  // Load user info separately: ProjectSubmission has no User relation in the Prisma schema
  const userIds = [...new Set(submissions.map((s) => s.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const items: EvaluationListItem[] = submissions.map((s) => {
    const user = userMap.get(s.userId);
    let filesPayload: EvaluationListItem["filesPayload"] = { type: "files" };
    try {
      filesPayload = JSON.parse(s.files) as EvaluationListItem["filesPayload"];
    } catch {
      // keep default
    }

    return {
      id: s.id,
      status: s.status,
      submittedAt: s.submittedAt.toISOString(),
      project: {
        id: s.project.id,
        title: s.project.title,
        moduleTitle: s.project.module.title,
      },
      submitter: {
        id: s.userId,
        name: user?.name ?? null,
        email: user?.email ?? "",
      },
      filesPayload,
    };
  });
  return items;
}
