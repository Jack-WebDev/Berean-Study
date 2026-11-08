ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_browse_testament_check";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_line_length_check";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_page_colour_check";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_verse_layout_check";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_reading_text_size_check";
--> statement-breakpoint
ALTER TABLE "reading_positions" DROP CONSTRAINT IF EXISTS "reading_positions_place_positive_check";
--> statement-breakpoint
ALTER TABLE "reading_history" DROP CONSTRAINT IF EXISTS "reading_history_visit_check";
--> statement-breakpoint
ALTER TABLE "reading_positions" DROP CONSTRAINT IF EXISTS "reading_positions_translation_id_translations_id_fk";
--> statement-breakpoint
ALTER TABLE "reading_positions" DROP CONSTRAINT IF EXISTS "reading_positions_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "reading_history" DROP CONSTRAINT IF EXISTS "reading_history_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "browse_testament";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "reader_hint_seen_at";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "welcome_completed_at";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "show_section_headings";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "line_length";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "page_colour";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "show_verse_numbers";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "verse_layout";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "reading_text_size";
--> statement-breakpoint
-- Places and visits recorded by the Bible reader have no stored passage to go back
-- to, so rolling back has to forget them.
DELETE FROM "reading_positions" WHERE "passage_id" IS NULL;
--> statement-breakpoint
DELETE FROM "reading_history" WHERE "passage_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "reading_positions" DROP COLUMN IF EXISTS "updated_at";
--> statement-breakpoint
ALTER TABLE "reading_positions" DROP COLUMN IF EXISTS "translation_id";
--> statement-breakpoint
ALTER TABLE "reading_positions" DROP COLUMN IF EXISTS "verse";
--> statement-breakpoint
ALTER TABLE "reading_positions" DROP COLUMN IF EXISTS "chapter";
--> statement-breakpoint
ALTER TABLE "reading_positions" DROP COLUMN IF EXISTS "book_id";
--> statement-breakpoint
ALTER TABLE "reading_history" DROP COLUMN IF EXISTS "chapter";
--> statement-breakpoint
ALTER TABLE "reading_history" DROP COLUMN IF EXISTS "book_id";
--> statement-breakpoint
ALTER TABLE "reading_positions" ALTER COLUMN "passage_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "reading_history" ALTER COLUMN "passage_id" SET NOT NULL;
