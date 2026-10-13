import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { claimCertificate } from "@/lib/certificates";
import { isCertificateTrack } from "@/lib/certificate-rules";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/certificates { track, name }
 * Claim a certificate the learner has earned, printed with the name they confirmed. Eligibility is
 * checked here; claiming again returns the certificate already issued.
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const limited = await rateLimit("certificateClaim", context.userId);
    if (!limited.ok) return tooManyRequests(limited);

    const body = (await req.json().catch(() => null)) as { track?: unknown; name?: unknown } | null;
    if (!isCertificateTrack(body?.track)) return NextResponse.json({ error: "Unknown certificate." }, { status: 400 });

    const result = await claimCertificate(context.userId, body.track, body.name);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ certificate: result.certificate, created: result.created }, { status: result.created ? 201 : 200 });
  } catch (error) {
    console.error("Error claiming a certificate:", error);
    return NextResponse.json({ error: "The certificate couldn't be issued. Try again in a moment." }, { status: 500 });
  }
});
