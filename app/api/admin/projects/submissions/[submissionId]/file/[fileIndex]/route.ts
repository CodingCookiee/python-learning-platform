import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    submissionId: string;
    fileIndex: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const admin = await isAdmin(user.id);
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      files?: Array<{ name: string; content: string; type: string }>;
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

    // Decode base64 content
    const content = Buffer.from(file.content, "base64");

    // Return file with appropriate headers
    return new NextResponse(content, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
        "Content-Length": content.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
