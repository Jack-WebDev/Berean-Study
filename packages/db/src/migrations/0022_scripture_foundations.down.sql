ALTER TABLE "translations" DROP CONSTRAINT IF EXISTS "translations_permission_state_check";
--> statement-breakpoint
ALTER TABLE "books" DROP CONSTRAINT IF EXISTS "books_full_title_not_blank_check";
--> statement-breakpoint
ALTER TABLE "books" DROP CONSTRAINT IF EXISTS "books_short_name_not_blank_check";
--> statement-breakpoint
ALTER TABLE "translations" DROP CONSTRAINT IF EXISTS "translations_permission_recorded_by_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "verse_presence_translation_idx";
--> statement-breakpoint
ALTER TABLE "verse_presence" DROP CONSTRAINT IF EXISTS "verse_presence_included_in_verse_id_verses_id_fk";
--> statement-breakpoint
ALTER TABLE "verse_presence" DROP CONSTRAINT IF EXISTS "verse_presence_translation_id_translations_id_fk";
--> statement-breakpoint
ALTER TABLE "verse_presence" DROP CONSTRAINT IF EXISTS "verse_presence_verse_id_verses_id_fk";
--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN IF EXISTS "quotation_limits";
--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN IF EXISTS "licence_ends_on";
--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN IF EXISTS "permission_recorded_by_user_id";
--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN IF EXISTS "permission_recorded_at";
--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN IF EXISTS "licensed";
--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN IF EXISTS "copyright_notice";
--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN IF EXISTS "rights_holder";
--> statement-breakpoint
ALTER TABLE "translations" DROP COLUMN IF EXISTS "edition";
--> statement-breakpoint
ALTER TABLE "books" DROP COLUMN IF EXISTS "expected_verses";
--> statement-breakpoint
ALTER TABLE "books" DROP COLUMN IF EXISTS "expected_chapters";
--> statement-breakpoint
ALTER TABLE "books" DROP COLUMN IF EXISTS "book_group";
--> statement-breakpoint
ALTER TABLE "books" DROP COLUMN IF EXISTS "full_title";
--> statement-breakpoint
ALTER TABLE "books" DROP COLUMN IF EXISTS "short_name";
--> statement-breakpoint
DROP TABLE IF EXISTS "verse_presence";
