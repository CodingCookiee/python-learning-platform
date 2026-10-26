import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { listPendingSubmissions } from "@/lib/admin/submissions";

export type { EvaluationListItem } from "@/lib/admin/submissions";

/**
 * GET /api/admin/projects/submissions
 * The capstone submissions waiting for review (lib/admin/submissions.ts): who, what and when, never
 * the uploaded files, which the grading page loads one submission at a time. Admin only.
 */
export const GET = withAdmin(async () => {
  try {
    const { rows, total } = await listPendingSubmissions();
    return NextResponse.json({ submissions: rows, total });
  } catch (error) {
    console.error("Error listing submissions:", error);
    return NextResponse.json({ error: "Failed to list submissions" }, { status: 500 });
  }
});
