CREATE TABLE "note_versions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "note_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"note_id" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "pinned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_versions_note_id_created_at_idx" ON "note_versions" USING btree ("note_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_purpose_check" CHECK ("notes"."purpose" IS NULL OR "notes"."purpose" IN ('observation', 'reflection', 'application', 'prayer'));--> statement-breakpoint
-- Fill search_text for existing notes from every text node in the stored body.
UPDATE "notes" SET "search_text" = coalesce((
	SELECT string_agg(t #>> '{}', ' ')
	FROM jsonb_path_query("notes"."content"::jsonb, 'strict $.** ? (@.type == "text").text') AS t
), '');
