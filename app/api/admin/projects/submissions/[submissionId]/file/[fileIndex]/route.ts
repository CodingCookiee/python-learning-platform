import { NextRequest, NextResponse } from "next/server";
import { withAdmin, type AuthContext } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET: one uploaded file of a submission, for the examiner. Always an inert download: the learner
 * chose the name and the content, so neither the browser's type sniffing nor the page can run it.
 */
export const GET = withAdmin<{ submissionId: string; fileIndex: string }>(
  async (
    _request: NextRequest,
    context: AuthContext<{ submissionId: string; fileIndex: string }>
  ) => {
    try {
      const { submissionId, fileIndex } = await context.params;
      const index = parseInt(fileIndex, 10);

      if (isNaN(index) || index < 0) {
        return NextResponse.json({ error: "Invalid file index" }, { status: 400 });
      }

      const submission = await prisma.projectSubmission.findUnique({
        where: { id: submissionId },
        select: { files: true },
      });

      if (!submission) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      let filesPayload: {
        type: string;
        files?: Array<{ name: string; content?: string; type: string; size?: number }>;
      };
      try {
        filesPayload = JSON.parse(submission.files);
      } catch {
        return NextResponse.json({ error: "Invalid file data" }, { status: 500 });
      }

      if (filesPayload.type !== "files" || !filesPayload.files || !filesPayload.files[index]) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const file = filesPayload.files[index];
      if (!file.content) {
        return NextResponse.json(
          {
            error:
              "Original file content was not stored for this submission. Legacy submissions can only show metadata.",
          },
          { status: 410 }
        );
      }

      const content = Buffer.from(file.content, "base64");
      // The plain-ASCII fallback name keeps only safe characters; the UTF-8 form carries the real one
      const asciiName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
          "Content-Length": content.length.toString(),
          "Content-Security-Policy": "sandbox",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
    }
  }
);
