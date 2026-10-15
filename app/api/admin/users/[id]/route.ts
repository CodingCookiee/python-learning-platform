import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withSuperAdmin, type AuthContext } from "@/lib/api-auth";
import * as actions from "@/lib/admin/actions";

const reason = z.string().trim().max(500).default("");
const moduleId = z.string().min(1).max(64);
const code = z.string().trim().min(1).max(40);

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"), reason }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({
    action: z.literal("delete"),
    confirmEmail: z.string().max(320),
    block: z.boolean().default(false),
  }),
  z.object({ action: z.literal("role"), role: z.enum(["LEARNER", "ADMIN", "SUPER_ADMIN"]) }),
  z.object({ action: z.literal("verify") }),
  z.object({ action: z.literal("reset-link") }),
  z.object({ action: z.literal("grant-module"), moduleId }),
  z.object({ action: z.literal("revoke-module"), moduleId }),
  z.object({ action: z.literal("clear-cooldown"), moduleId }),
  z.object({ action: z.literal("revoke-certificate"), code, reason }),
  z.object({ action: z.literal("reinstate-certificate"), code }),
]);

/**
 * POST /api/admin/users/[id] { action, ... }
 * One super admin action on one account (lib/admin/actions.ts). Each is guarded and written to the audit
 * log. Certificate actions must name a certificate that belongs to this account.
 */
export const POST = withSuperAdmin<{ id: string }>(
  async (req: NextRequest, context: AuthContext<{ id: string }>) => {
    const { id } = await context.params;
    const parsed = actionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json({ error: "That action isn't recognised." }, { status: 400 });
    const me = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { id: true, email: true },
    });
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const a = parsed.data;
    if (a.action === "revoke-certificate" || a.action === "reinstate-certificate") {
      const owned = await prisma.certificate.findFirst({
        where: { code: a.code, userId: id },
        select: { code: true },
      });
      if (!owned)
        return NextResponse.json(
          { error: "That certificate isn't this account's." },
          { status: 404 }
        );
    }

    let result: actions.ActionResult;
    switch (a.action) {
      case "suspend":
        result = await actions.suspendUser(me, id, a.reason);
        break;
      case "unsuspend":
        result = await actions.unsuspendUser(me, id);
        break;
      case "delete":
        result = await actions.deleteUser(me, id, a.confirmEmail, a.block);
        break;
      case "role":
        result = await actions.setRole(me, id, a.role);
        break;
      case "verify":
        result = await actions.markVerified(me, id);
        break;
      case "reset-link":
        result = await actions.sendResetLink(me, id);
        break;
      case "grant-module":
        result = await actions.grantModulePass(me, id, a.moduleId);
        break;
      case "revoke-module":
        result = await actions.revokeModulePass(me, id, a.moduleId);
        break;
      case "clear-cooldown":
        result = await actions.clearGradingCooldown(me, id, a.moduleId);
        break;
      case "revoke-certificate":
        result = await actions.revokeCertificate(me, a.code, a.reason);
        break;
      case "reinstate-certificate":
        result = await actions.reinstateCertificate(me, a.code);
        break;
    }
    return result.ok
      ? NextResponse.json({ message: result.message })
      : NextResponse.json({ error: result.error }, { status: result.status });
  }
);
