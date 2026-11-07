ALTER TABLE "published_book_introduction_sections" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "published_commentaries" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "published_commentary_sections" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "published_book_introduction_sections" CASCADE;--> statement-breakpoint
DROP TABLE "published_commentaries" CASCADE;--> statement-breakpoint
DROP TABLE "published_commentary_sections" CASCADE;--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT "content_revisions_id_book_intro_section_unique";--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT "content_revisions_id_commentary_unique";--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT "content_revisions_id_commentary_section_unique";--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT "content_revisions_content_not_empty_check";--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT "content_revisions_exactly_one_target_check";--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT "content_revisions_snapshot_shape_check";--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT "content_revisions_book_introduction_section_id_book_introduction_sections_id_fk";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT "content_revisions_commentary_passage_id_commentaries_passage_id_fk";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT "content_revisions_commentary_section_id_commentary_sections_id_fk";
--> statement-breakpoint
DROP INDEX "content_revisions_book_intro_section_idx";--> statement-breakpoint
DROP INDEX "content_revisions_commentary_idx";--> statement-breakpoint
DROP INDEX "content_revisions_commentary_section_idx";--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN "position";--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN "book_introduction_section_id";--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN "commentary_passage_id";--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN "commentary_section_id";