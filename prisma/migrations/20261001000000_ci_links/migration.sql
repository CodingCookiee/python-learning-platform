-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "acceptance" JSONB;

-- CreateTable
CREATE TABLE "ci_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "statusDetail" TEXT,
    "runId" TEXT,
    "runUrl" TEXT,
    "sha" TEXT,
    "report" JSONB,
    "reportedAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ci_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ci_links_token_key" ON "ci_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ci_links_userId_kind_targetId_key" ON "ci_links"("userId", "kind", "targetId");

-- AddForeignKey
ALTER TABLE "ci_links" ADD CONSTRAINT "ci_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

