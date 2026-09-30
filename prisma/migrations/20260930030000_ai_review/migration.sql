-- AlterTable
ALTER TABLE "project_submissions" ADD COLUMN     "aiReview" JSONB,
ADD COLUMN     "aiReviewedAt" TIMESTAMP(3);

