-- A belt test-out: one grading that covers several modules of a belt
ALTER TABLE "checkpoint_attempts" ADD COLUMN "belt" TEXT,
ADD COLUMN "coversModuleIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
