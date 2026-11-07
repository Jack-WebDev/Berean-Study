-- Written by hand, because dropped tables can't be reversed automatically. Their
-- old rows are gone, and commentary written since then stays in content_revisions.
CREATE TABLE "commentaries" (
	"passage_id" integer PRIMARY KEY NOT NULL REFERENCES "passages"("id") ON DELETE restrict,
	"content" text NOT NULL,
	CONSTRAINT "commentaries_content_not_empty_check" CHECK (btrim("commentaries"."content") <> '')
);
--> statement-breakpoint
CREATE TABLE "commentary_sections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
	"passage_id" integer NOT NULL REFERENCES "commentaries"("passage_id") ON DELETE cascade,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "commentary_sections_passage_position_unique" UNIQUE("passage_id","position"),
	CONSTRAINT "commentary_sections_title_not_empty_check" CHECK (btrim("commentary_sections"."title") <> ''),
	CONSTRAINT "commentary_sections_content_not_empty_check" CHECK (btrim("commentary_sections"."content") <> ''),
	CONSTRAINT "commentary_sections_position_positive_check" CHECK ("commentary_sections"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "book_introductions" (
	"book_id" integer PRIMARY KEY NOT NULL REFERENCES "books"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE "book_introduction_sections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
	"book_id" integer NOT NULL REFERENCES "book_introductions"("book_id") ON DELETE restrict,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "book_introduction_sections_book_type_unique" UNIQUE("book_id","type"),
	CONSTRAINT "book_introduction_sections_book_position_unique" UNIQUE("book_id","position"),
	CONSTRAINT "book_introduction_sections_type_not_empty_check" CHECK (btrim("book_introduction_sections"."type") <> ''),
	CONSTRAINT "book_introduction_sections_title_not_empty_check" CHECK (btrim("book_introduction_sections"."title") <> ''),
	CONSTRAINT "book_introduction_sections_content_not_empty_check" CHECK (btrim("book_introduction_sections"."content") <> ''),
	CONSTRAINT "book_introduction_sections_position_positive_check" CHECK ("book_introduction_sections"."position" > 0)
);
