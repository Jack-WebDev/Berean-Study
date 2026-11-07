ALTER TABLE "community_reports" DROP CONSTRAINT IF EXISTS "community_reports_resolution_valid";
--> statement-breakpoint
DROP INDEX IF EXISTS "community_reports_post_reporter_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "posting_restrictions_user_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "moderation_actions_post_idx";
--> statement-breakpoint
ALTER TABLE "posting_restrictions" DROP CONSTRAINT IF EXISTS "posting_restrictions_lifted_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "posting_restrictions" DROP CONSTRAINT IF EXISTS "posting_restrictions_restricted_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "posting_restrictions" DROP CONSTRAINT IF EXISTS "posting_restrictions_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "moderation_actions" DROP CONSTRAINT IF EXISTS "moderation_actions_moderator_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "moderation_actions" DROP CONSTRAINT IF EXISTS "moderation_actions_community_post_id_community_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_resolution_valid" CHECK ("community_reports"."resolution" IS NULL OR "community_reports"."resolution" IN (
				'dismissed',
				'action_taken'
			));
--> statement-breakpoint
DROP TABLE IF EXISTS "posting_restrictions";
--> statement-breakpoint
DROP TABLE IF EXISTS "moderation_actions";
