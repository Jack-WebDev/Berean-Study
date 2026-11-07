DROP INDEX IF EXISTS "verse_text_revisions_status_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "verse_text_revisions_verse_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "verse_text_revisions_one_published_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "verse_text_revisions_one_open_idx";
--> statement-breakpoint
ALTER TABLE "verse_text_revisions" DROP CONSTRAINT IF EXISTS "verse_text_revisions_published_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "verse_text_revisions" DROP CONSTRAINT IF EXISTS "verse_text_revisions_returned_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "verse_text_revisions" DROP CONSTRAINT IF EXISTS "verse_text_revisions_proofread_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "verse_text_revisions" DROP CONSTRAINT IF EXISTS "verse_text_revisions_based_on_revision_id_verse_text_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "verse_text_revisions" DROP CONSTRAINT IF EXISTS "verse_text_revisions_entered_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "verse_text_revisions" DROP CONSTRAINT IF EXISTS "verse_text_revisions_verse_id_verses_id_fk";
--> statement-breakpoint
ALTER TABLE "verse_text_revisions" DROP CONSTRAINT IF EXISTS "verse_text_revisions_translation_id_translations_id_fk";
--> statement-breakpoint
DROP TABLE IF EXISTS "verse_text_revisions";
