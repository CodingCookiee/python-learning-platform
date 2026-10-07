-- CreateTable
CREATE TABLE "quest_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quest" TEXT NOT NULL,
    "completed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),

    CONSTRAINT "quest_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quest_progress_userId_quest_key" ON "quest_progress"("userId", "quest");

-- AddForeignKey
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

