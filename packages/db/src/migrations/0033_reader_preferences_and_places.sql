ALTER TABLE "reading_history" ALTER COLUMN "passage_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_positions" ALTER COLUMN "passage_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_history" ADD COLUMN "book_id" integer;--> statement-breakpoint
ALTER TABLE "reading_history" ADD COLUMN "chapter" smallint;--> statement-breakpoint
ALTER TABLE "reading_positions" ADD COLUMN "book_id" integer;--> statement-breakpoint
ALTER TABLE "reading_positions" ADD COLUMN "chapter" smallint;--> statement-breakpoint
ALTER TABLE "reading_positions" ADD COLUMN "verse" smallint;--> statement-breakpoint
ALTER TABLE "reading_positions" ADD COLUMN "translation_id" integer;--> statement-breakpoint
ALTER TABLE "reading_positions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "reading_text_size" text DEFAULT 'large' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "verse_layout" text DEFAULT 'verse' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "show_verse_numbers" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "page_colour" text DEFAULT 'light' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "line_length" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "show_section_headings" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "welcome_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "reader_hint_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "browse_testament" text DEFAULT 'old' NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_positions" ADD CONSTRAINT "reading_positions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_positions" ADD CONSTRAINT "reading_positions_translation_id_translations_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_visit_check" CHECK (("reading_history"."passage_id" IS NOT NULL) <> ("reading_history"."book_id" IS NOT NULL)
				AND ("reading_history"."book_id" IS NULL) = ("reading_history"."chapter" IS NULL));--> statement-breakpoint
ALTER TABLE "reading_positions" ADD CONSTRAINT "reading_positions_place_positive_check" CHECK ("reading_positions"."chapter" > 0 AND "reading_positions"."verse" > 0);--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_reading_text_size_check" CHECK ("user_preferences"."reading_text_size" IN ('standard', 'large', 'larger', 'largest'));--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_verse_layout_check" CHECK ("user_preferences"."verse_layout" IN ('verse', 'paragraph'));--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_page_colour_check" CHECK ("user_preferences"."page_colour" IN ('light', 'dark', 'system'));--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_line_length_check" CHECK ("user_preferences"."line_length" IN ('narrow', 'default', 'wide'));--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_browse_testament_check" CHECK ("user_preferences"."browse_testament" IN ('old', 'new'));--> statement-breakpoint
-- Each saved place pointed at a stored passage. Keep it as that passage's first verse.
UPDATE "reading_positions" AS position
SET "book_id" = chapter."book_id", "chapter" = chapter."number", "verse" = verse."number"
FROM "passage_ranges" AS range
INNER JOIN "verses" AS verse ON verse."id" = range."start_verse_id"
INNER JOIN "chapters" AS chapter ON chapter."id" = verse."chapter_id"
WHERE range."passage_id" = position."passage_id";--> statement-breakpoint
-- A passage with no verses mapped yet still names its book, so start at its beginning.
UPDATE "reading_positions" AS position
SET "book_id" = passage."book_id", "chapter" = 1, "verse" = 1
FROM "passages" AS passage
WHERE passage."id" = position."passage_id" AND position."book_id" IS NULL;
