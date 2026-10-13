import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { updateCertificate } from "@/lib/certificates";
import { normaliseCode } from "@/lib/certificate-rules";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * PATCH /api/certificates/[code] { name } or { withdrawn }
 * The holder fixes the printed name, or withdraws (and restores) the certificate's public page.
 */
export const PATCH = withAuth(async (req: NextRequest, context: AuthContext<{ code: string }>) => {
  try {
    const limited = await rateLimit("certificateClaim", context.userId);
    if (!limited.ok) return tooManyRequests(limited);

    const code = normaliseCode((await context.params).code);
    if (!code) return NextResponse.json({ error: "No certificate with that ID." }, { status: 404 });
    const body = (await req.json().catch(() => null)) as { name?: unknown; withdrawn?: unknown } | null;

    const result = await updateCertificate(context.userId, code, { name: body?.name, withdrawn: body?.withdrawn });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ certificate: result.certificate });
  } catch (error) {
    console.error("Error changing a certificate:", error);
    return NextResponse.json({ error: "That didn't save. Try again in a moment." }, { status: 500 });
  }
});
