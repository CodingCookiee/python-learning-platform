-- When an account last used the app (signed-in pages), for the admin overview
ALTER TABLE "users" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- Until each account is next seen: its last training day, or when it joined
UPDATE "users" u SET "lastSeenAt" = GREATEST(u."createdAt", COALESCE((SELECT s."lastActivityDate" FROM "streaks" s WHERE s."userId" = u."id"), u."createdAt"));
