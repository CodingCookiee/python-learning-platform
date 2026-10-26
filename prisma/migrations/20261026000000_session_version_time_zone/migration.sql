-- Raised when the password changes, so sessions signed in before it stop working (security review M-2)
ALTER TABLE "users" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- The learner's own time zone, so a training day is their day rather than the server's (UTC)
ALTER TABLE "users" ADD COLUMN "timeZone" TEXT;
