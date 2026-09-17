DROP INDEX IF EXISTS "testimony_prayers_prayer_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "testimony_passages_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "testimony_notes_note_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "testimonies_user_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "prayers_user_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "prayer_reflections_prayer_id_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "prayer_passages_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "community_reports_community_post_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "community_reports_resolution_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "community_posts_author_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "community_posts_type_feed_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "community_posts_feed_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "community_posts_source_prayer_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "community_posts_source_testimony_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "community_posts_source_note_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "community_posts_source_collection_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "community_post_passages_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "community_post_bookmarks_community_post_id_idx";
--> statement-breakpoint
ALTER TABLE "testimony_prayers" DROP CONSTRAINT IF EXISTS "testimony_prayers_prayer_owner_fk";
--> statement-breakpoint
ALTER TABLE "testimony_prayers" DROP CONSTRAINT IF EXISTS "testimony_prayers_testimony_owner_fk";
--> statement-breakpoint
ALTER TABLE "testimony_passages" DROP CONSTRAINT IF EXISTS "testimony_passages_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "testimony_passages" DROP CONSTRAINT IF EXISTS "testimony_passages_testimony_id_testimonies_id_fk";
--> statement-breakpoint
ALTER TABLE "testimony_notes" DROP CONSTRAINT IF EXISTS "testimony_notes_note_owner_fk";
--> statement-breakpoint
ALTER TABLE "testimony_notes" DROP CONSTRAINT IF EXISTS "testimony_notes_testimony_owner_fk";
--> statement-breakpoint
ALTER TABLE "testimonies" DROP CONSTRAINT IF EXISTS "testimonies_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "prayers" DROP CONSTRAINT IF EXISTS "prayers_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "prayer_reflections" DROP CONSTRAINT IF EXISTS "prayer_reflections_prayer_id_prayers_id_fk";
--> statement-breakpoint
ALTER TABLE "prayer_passages" DROP CONSTRAINT IF EXISTS "prayer_passages_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "prayer_passages" DROP CONSTRAINT IF EXISTS "prayer_passages_prayer_id_prayers_id_fk";
--> statement-breakpoint
ALTER TABLE "community_reports" DROP CONSTRAINT IF EXISTS "community_reports_reviewed_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "community_reports" DROP CONSTRAINT IF EXISTS "community_reports_reported_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "community_reports" DROP CONSTRAINT IF EXISTS "community_reports_community_post_id_community_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "community_posts" DROP CONSTRAINT IF EXISTS "community_posts_source_prayer_id_prayers_id_fk";
--> statement-breakpoint
ALTER TABLE "community_posts" DROP CONSTRAINT IF EXISTS "community_posts_source_testimony_id_testimonies_id_fk";
--> statement-breakpoint
ALTER TABLE "community_posts" DROP CONSTRAINT IF EXISTS "community_posts_source_note_id_notes_id_fk";
--> statement-breakpoint
ALTER TABLE "community_posts" DROP CONSTRAINT IF EXISTS "community_posts_source_collection_id_collections_id_fk";
--> statement-breakpoint
ALTER TABLE "community_posts" DROP CONSTRAINT IF EXISTS "community_posts_author_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "community_post_passages" DROP CONSTRAINT IF EXISTS "community_post_passages_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "community_post_passages" DROP CONSTRAINT IF EXISTS "community_post_passages_community_post_id_community_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "community_post_bookmarks" DROP CONSTRAINT IF EXISTS "community_post_bookmarks_community_post_id_community_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "community_post_bookmarks" DROP CONSTRAINT IF EXISTS "community_post_bookmarks_user_id_user_id_fk";
--> statement-breakpoint
DROP TABLE IF EXISTS "testimony_prayers";
--> statement-breakpoint
DROP TABLE IF EXISTS "testimony_passages";
--> statement-breakpoint
DROP TABLE IF EXISTS "testimony_notes";
--> statement-breakpoint
DROP TABLE IF EXISTS "testimonies";
--> statement-breakpoint
DROP TABLE IF EXISTS "prayers";
--> statement-breakpoint
DROP TABLE IF EXISTS "prayer_reflections";
--> statement-breakpoint
DROP TABLE IF EXISTS "prayer_passages";
--> statement-breakpoint
DROP TABLE IF EXISTS "community_reports";
--> statement-breakpoint
DROP TABLE IF EXISTS "community_posts";
--> statement-breakpoint
DROP TABLE IF EXISTS "community_post_passages";
--> statement-breakpoint
DROP TABLE IF EXISTS "community_post_bookmarks";
