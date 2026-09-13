DROP INDEX IF EXISTS "notifications_user_unread_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "notifications_user_created_at_idx";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_user_id_fk";
--> statement-breakpoint
DROP TABLE IF EXISTS "notifications";
