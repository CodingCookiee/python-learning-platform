-- One AI key per provider instead of one per learner (docs/superpowers/specs/2026-10-27-multiple-ai-models-design.md)
DROP INDEX "ai_credentials_userId_key";

ALTER TABLE "ai_credentials" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Every learner has at most one key so far, so that key is their default
UPDATE "ai_credentials" SET "isDefault" = true;

CREATE UNIQUE INDEX "ai_credentials_userId_provider_key" ON "ai_credentials"("userId", "provider");
