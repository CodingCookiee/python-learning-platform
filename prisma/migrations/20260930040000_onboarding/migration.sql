-- AlterTable
ALTER TABLE "users" ADD COLUMN     "experience" TEXT,
ADD COLUMN     "goal" TEXT,
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "weeklyHours" INTEGER NOT NULL DEFAULT 10;

