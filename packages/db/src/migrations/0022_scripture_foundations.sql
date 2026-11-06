CREATE TABLE "verse_presence" (
	"verse_id" integer NOT NULL,
	"translation_id" integer NOT NULL,
	"kind" text NOT NULL,
	"included_in_verse_id" integer,
	CONSTRAINT "verse_presence_verse_id_translation_id_pk" PRIMARY KEY("verse_id","translation_id"),
	CONSTRAINT "verse_presence_kind_check" CHECK ("verse_presence"."kind" IN (
				'included_in',
				'omitted_footnote',
				'bracketed',
				'not_in_translation'
			)),
	CONSTRAINT "verse_presence_included_in_check" CHECK (("verse_presence"."kind" = 'included_in') = ("verse_presence"."included_in_verse_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "short_name" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "full_title" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "book_group" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "expected_chapters" integer;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "expected_verses" integer;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "edition" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "rights_holder" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "copyright_notice" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "licensed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "permission_recorded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "permission_recorded_by_user_id" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "licence_ends_on" date;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "quotation_limits" text;--> statement-breakpoint
ALTER TABLE "verse_presence" ADD CONSTRAINT "verse_presence_verse_id_verses_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."verses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_presence" ADD CONSTRAINT "verse_presence_translation_id_translations_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_presence" ADD CONSTRAINT "verse_presence_included_in_verse_id_verses_id_fk" FOREIGN KEY ("included_in_verse_id") REFERENCES "public"."verses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verse_presence_translation_idx" ON "verse_presence" USING btree ("translation_id");--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_permission_recorded_by_user_id_user_id_fk" FOREIGN KEY ("permission_recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_short_name_not_blank_check" CHECK ("books"."short_name" IS NULL OR btrim("books"."short_name") <> '');--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_full_title_not_blank_check" CHECK ("books"."full_title" IS NULL OR btrim("books"."full_title") <> '');--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_permission_state_check" CHECK (("translations"."permission_recorded_at" IS NULL) = ("translations"."permission_recorded_by_user_id" IS NULL));