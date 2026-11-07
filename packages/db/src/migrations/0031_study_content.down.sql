ALTER TABLE "themes" DROP CONSTRAINT IF EXISTS "themes_status_check";
--> statement-breakpoint
ALTER TABLE "themes" DROP CONSTRAINT IF EXISTS "themes_merged_into_theme_id_themes_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "content_source_links_source_id_index";
--> statement-breakpoint
DROP INDEX IF EXISTS "content_passages_book_chapters_index";
--> statement-breakpoint
ALTER TABLE "content_source_links" DROP CONSTRAINT IF EXISTS "content_source_links_source_id_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "content_source_links" DROP CONSTRAINT IF EXISTS "content_source_links_content_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "content_passages" DROP CONSTRAINT IF EXISTS "content_passages_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "content_passages" DROP CONSTRAINT IF EXISTS "content_passages_content_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "themes" DROP COLUMN IF EXISTS "created_at";
--> statement-breakpoint
ALTER TABLE "themes" DROP COLUMN IF EXISTS "merged_into_theme_id";
--> statement-breakpoint
ALTER TABLE "themes" DROP COLUMN IF EXISTS "status";
--> statement-breakpoint
DROP TABLE IF EXISTS "content_source_links";
--> statement-breakpoint
DROP TABLE IF EXISTS "content_passages";
