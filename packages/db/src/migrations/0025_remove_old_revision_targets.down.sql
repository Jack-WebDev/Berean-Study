-- Written by hand, because dropped columns can't be reversed automatically.
-- The revisions themselves can't be restored, so any that exist are cleared first.
TRUNCATE TABLE "content_revisions" CASCADE;
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "content" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "title" text;
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "position" integer;
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "book_introduction_section_id" integer;
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "commentary_passage_id" integer;
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "commentary_section_id" integer;
--> statement-breakpoint
CREATE INDEX "content_revisions_book_intro_section_idx" ON "content_revisions" USING btree ("book_introduction_section_id","created_at") WHERE "content_revisions"."book_introduction_section_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "content_revisions_commentary_idx" ON "content_revisions" USING btree ("commentary_passage_id","created_at") WHERE "content_revisions"."commentary_passage_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "content_revisions_commentary_section_idx" ON "content_revisions" USING btree ("commentary_section_id","created_at") WHERE "content_revisions"."commentary_section_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_book_introduction_section_id_book_introduction_sections_id_fk" FOREIGN KEY ("book_introduction_section_id") REFERENCES "public"."book_introduction_sections"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_commentary_passage_id_commentaries_passage_id_fk" FOREIGN KEY ("commentary_passage_id") REFERENCES "public"."commentaries"("passage_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_commentary_section_id_commentary_sections_id_fk" FOREIGN KEY ("commentary_section_id") REFERENCES "public"."commentary_sections"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_id_book_intro_section_unique" UNIQUE("id","book_introduction_section_id");
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_id_commentary_unique" UNIQUE("id","commentary_passage_id");
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_id_commentary_section_unique" UNIQUE("id","commentary_section_id");
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_content_not_empty_check" CHECK (btrim("content_revisions"."content") <> '');
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_exactly_one_target_check" CHECK (num_nonnulls("content_revisions"."book_introduction_section_id", "content_revisions"."commentary_passage_id", "content_revisions"."commentary_section_id") = 1);
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_snapshot_shape_check" CHECK (("content_revisions"."commentary_passage_id" IS NOT NULL AND "content_revisions"."title" IS NULL AND "content_revisions"."position" IS NULL) OR (("content_revisions"."book_introduction_section_id" IS NOT NULL OR "content_revisions"."commentary_section_id" IS NOT NULL) AND "content_revisions"."title" IS NOT NULL AND btrim("content_revisions"."title") <> '' AND "content_revisions"."position" IS NOT NULL AND "content_revisions"."position" > 0));
--> statement-breakpoint
CREATE TABLE "published_book_introduction_sections" (
	"book_introduction_section_id" integer PRIMARY KEY NOT NULL,
	"content_revision_id" integer NOT NULL,
	CONSTRAINT "published_book_intro_sections_section_fk" FOREIGN KEY ("book_introduction_section_id") REFERENCES "public"."book_introduction_sections"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "published_book_intro_sections_revision_target_fk" FOREIGN KEY ("content_revision_id","book_introduction_section_id") REFERENCES "public"."content_revisions"("id","book_introduction_section_id") ON DELETE restrict ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "published_commentaries" (
	"passage_id" integer PRIMARY KEY NOT NULL,
	"content_revision_id" integer NOT NULL,
	CONSTRAINT "published_commentaries_passage_id_commentaries_passage_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."commentaries"("passage_id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "published_commentaries_revision_target_fk" FOREIGN KEY ("content_revision_id","passage_id") REFERENCES "public"."content_revisions"("id","commentary_passage_id") ON DELETE restrict ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "published_commentary_sections" (
	"commentary_section_id" integer PRIMARY KEY NOT NULL,
	"content_revision_id" integer NOT NULL,
	CONSTRAINT "published_commentary_sections_commentary_section_id_commentary_sections_id_fk" FOREIGN KEY ("commentary_section_id") REFERENCES "public"."commentary_sections"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "published_commentary_sections_revision_target_fk" FOREIGN KEY ("content_revision_id","commentary_section_id") REFERENCES "public"."content_revisions"("id","commentary_section_id") ON DELETE restrict ON UPDATE no action
);
