DROP INDEX IF EXISTS "change_proposals_target_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "change_proposals_status_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "account_suspensions_user_idx";
--> statement-breakpoint
ALTER TABLE "change_proposals" DROP CONSTRAINT IF EXISTS "change_proposals_decided_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "change_proposals" DROP CONSTRAINT IF EXISTS "change_proposals_proposer_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "account_suspensions" DROP CONSTRAINT IF EXISTS "account_suspensions_lifted_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "account_suspensions" DROP CONSTRAINT IF EXISTS "account_suspensions_suspended_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "account_suspensions" DROP CONSTRAINT IF EXISTS "account_suspensions_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "deleted_at";
--> statement-breakpoint
DROP TABLE IF EXISTS "change_proposals";
--> statement-breakpoint
DROP TABLE IF EXISTS "account_suspensions";
