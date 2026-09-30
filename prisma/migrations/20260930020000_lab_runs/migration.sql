-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "lab" JSONB;

-- CreateTable
CREATE TABLE "lab_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "lastPayload" TEXT,
    "lastResult" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "checks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lab_runs_token_key" ON "lab_runs"("token");

-- CreateIndex
CREATE UNIQUE INDEX "lab_runs_userId_lessonId_key" ON "lab_runs"("userId", "lessonId");

-- AddForeignKey
ALTER TABLE "lab_runs" ADD CONSTRAINT "lab_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_runs" ADD CONSTRAINT "lab_runs_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

