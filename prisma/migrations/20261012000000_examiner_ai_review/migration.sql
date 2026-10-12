-- AlterTable
ALTER TABLE "project_submissions" ADD COLUMN     "examinerAiReview" JSONB,
ADD COLUMN     "examinerAiReviewedAt" TIMESTAMP(3);
