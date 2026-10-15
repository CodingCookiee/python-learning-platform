-- Admin oversight (2026-10-15): suspension, an audit log, admin notifications, admin-granted passes and
-- revoked certificates. The age question is gone, so its column goes too.

-- Email addresses are compared lower-cased from now on (lib/email-address.ts). Existing ones are
-- lower-cased here, except where that would collide with another account (left as they are).
UPDATE "users" u SET "email" = lower(btrim(u."email"))
WHERE u."email" <> lower(btrim(u."email"))
  AND NOT EXISTS (SELECT 1 FROM "users" o WHERE o."id" <> u."id" AND lower(btrim(o."email")) = lower(btrim(u."email")));

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedReason" TEXT;

-- AlterTable
ALTER TABLE "checkpoint_attempts" ADD COLUMN     "grantedById" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "ageConfirmedAt",
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT;

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "targetLabel" TEXT NOT NULL DEFAULT '',
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_actions_createdAt_idx" ON "admin_actions"("createdAt");

-- CreateIndex
CREATE INDEX "admin_actions_targetId_idx" ON "admin_actions"("targetId");

-- CreateIndex
CREATE INDEX "admin_notifications_recipientId_readAt_createdAt_idx" ON "admin_notifications"("recipientId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

