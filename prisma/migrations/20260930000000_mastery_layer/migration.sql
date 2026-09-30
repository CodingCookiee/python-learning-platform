-- AlterTable
ALTER TABLE "exercise_submissions" ADD COLUMN     "checkpointAttemptId" TEXT,
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'practice';

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "checkpointPassMark" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
ADD COLUMN     "checkpointPick" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "checkpointPool" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "checkpoint_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "exerciseIds" TEXT[],
    "passedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "placement" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "checkpoint_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checkpoint_attempts_userId_moduleId_idx" ON "checkpoint_attempts"("userId", "moduleId");

-- CreateIndex
CREATE INDEX "review_items_userId_dueAt_idx" ON "review_items"("userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_items_userId_exerciseId_key" ON "review_items"("userId", "exerciseId");

-- AddForeignKey
ALTER TABLE "checkpoint_attempts" ADD CONSTRAINT "checkpoint_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoint_attempts" ADD CONSTRAINT "checkpoint_attempts_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

