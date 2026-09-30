-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "files" JSONB,
ADD COLUMN     "mainFile" TEXT NOT NULL DEFAULT 'solution.py';

