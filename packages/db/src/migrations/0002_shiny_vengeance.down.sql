DROP INDEX IF EXISTS "two_factor_userId_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "two_factor_secret_idx";
--> statement-breakpoint
ALTER TABLE "two_factor" DROP CONSTRAINT IF EXISTS "two_factor_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "two_factor_enabled";
--> statement-breakpoint
DROP TABLE IF EXISTS "two_factor";
