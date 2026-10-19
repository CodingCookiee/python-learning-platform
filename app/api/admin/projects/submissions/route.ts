import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { listPendingSubmissions } from "@/lib/admin/submissions";

export type { EvaluationListItem } from "@/lib/admin/submissions";

/**
 * GET /api/admin/projects/submissions
 * The capstone submissions waiting for review (lib/admin/submissions.ts). Admin only.
 */
export const GET = withAdmin(async () => {
  try {
    return NextResponse.json({ submissions: await listPendingSubmissions() });
  } catch (error) {
    console.error("Error listing submissions:", error);
    return NextResponse.json({ error: "Failed to list submissions" }, { status: 500 });
  }
});
