-- Verse posts don't fit the old list of post types, so rolling back removes them.
-- Posts that were reported or moderated are kept, because that history must not
-- disappear; if any exist, the constraint below fails and the rollback stops.
DELETE FROM "community_posts" AS post
WHERE post."post_type" = 'verse'
  AND NOT EXISTS (SELECT 1 FROM "community_reports" AS report WHERE report."community_post_id" = post."id")
  AND NOT EXISTS (SELECT 1 FROM "moderation_actions" AS action WHERE action."community_post_id" = post."id");
--> statement-breakpoint
ALTER TABLE "community_posts" DROP CONSTRAINT IF EXISTS "community_posts_post_type_valid";
--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_post_type_valid" CHECK ("community_posts"."post_type" IN (
				'collection',
				'note',
				'testimony',
				'prayer'
			));
