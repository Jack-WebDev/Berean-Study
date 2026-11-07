CREATE TABLE "content_passages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "content_passages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"content_revision_id" integer NOT NULL,
	"position" integer NOT NULL,
	"book_id" integer NOT NULL,
	"from_chapter" integer NOT NULL,
	"from_verse" integer NOT NULL,
	"to_chapter" integer NOT NULL,
	"to_verse" integer NOT NULL,
	"shows_to_readers" boolean DEFAULT true NOT NULL,
	CONSTRAINT "content_passages_revision_position_unique" UNIQUE("content_revision_id","position"),
	CONSTRAINT "content_passages_range_check" CHECK (
				"content_passages"."from_chapter" > 0
				AND "content_passages"."from_verse" > 0
				AND ("content_passages"."from_chapter", "content_passages"."from_verse") <= ("content_passages"."to_chapter", "content_passages"."to_verse")
			)
);
--> statement-breakpoint
CREATE TABLE "content_source_links" (
	"content_revision_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	CONSTRAINT "content_source_links_content_revision_id_source_id_pk" PRIMARY KEY("content_revision_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "merged_into_theme_id" integer;--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "content_passages" ADD CONSTRAINT "content_passages_content_revision_id_content_revisions_id_fk" FOREIGN KEY ("content_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_passages" ADD CONSTRAINT "content_passages_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_source_links" ADD CONSTRAINT "content_source_links_content_revision_id_content_revisions_id_fk" FOREIGN KEY ("content_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_source_links" ADD CONSTRAINT "content_source_links_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_passages_book_chapters_index" ON "content_passages" USING btree ("book_id","from_chapter","to_chapter");--> statement-breakpoint
CREATE INDEX "content_source_links_source_id_index" ON "content_source_links" USING btree ("source_id");--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_merged_into_theme_id_themes_id_fk" FOREIGN KEY ("merged_into_theme_id") REFERENCES "public"."themes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_status_check" CHECK ("themes"."status" IN ('active', 'merged'));