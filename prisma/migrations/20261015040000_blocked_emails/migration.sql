-- Addresses a super admin deleted and barred from signing up again: a keyed fingerprint only
CREATE TABLE "blocked_emails" (
    "hash" TEXT NOT NULL,
    "blockedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_emails_pkey" PRIMARY KEY ("hash")
);
