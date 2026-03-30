ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;

UPDATE "users" SET "password_hash" = '' WHERE "password_hash" IS NULL;

ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;
