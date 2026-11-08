ALTER TABLE "community_posts" DROP CONSTRAINT "community_posts_post_type_valid";--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_post_type_valid" CHECK ("community_posts"."post_type" IN (
				'collection',
				'note',
				'testimony',
				'prayer',
				'verse'
			));