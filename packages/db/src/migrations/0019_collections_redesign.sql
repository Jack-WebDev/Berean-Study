CREATE TABLE "collection_sections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "collection_sections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"collection_id" integer NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "collection_sections_title_not_empty_check" CHECK (btrim("collection_sections"."title") <> ''),
	CONSTRAINT "collection_sections_position_check" CHECK ("collection_sections"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "collection_passages" ADD COLUMN "section_id" integer;--> statement-breakpoint
ALTER TABLE "collection_passages" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_passages" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "collection_passages" ADD COLUMN "added_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "type" text DEFAULT 'list' NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "color" text DEFAULT '#efebe4' NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "visibility" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "pinned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "last_opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "collection_sections" ADD CONSTRAINT "collection_sections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_sections_collection_id_position_idx" ON "collection_sections" USING btree ("collection_id","position");--> statement-breakpoint
ALTER TABLE "collection_passages" ADD CONSTRAINT "collection_passages_section_id_collection_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."collection_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_passages_section_id_idx" ON "collection_passages" USING btree ("section_id");--> statement-breakpoint
ALTER TABLE "collection_passages" ADD CONSTRAINT "collection_passages_position_check" CHECK ("collection_passages"."position" >= 0);--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_type_check" CHECK ("collections"."type" IN ('list', 'project', 'teaching'));--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_visibility_check" CHECK ("collections"."visibility" IN ('private', 'shared', 'public'));--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_color_check" CHECK ("collections"."color" ~ '^#[0-9a-f]{6}$');--> statement-breakpoint
-- Number each collection's existing passages in the order they were shown before.
UPDATE "collection_passages" SET "position" = "ordered"."position"
FROM (
	SELECT "collection_id", "passage_id",
		row_number() OVER (PARTITION BY "collection_id" ORDER BY "passage_id") - 1 AS "position"
	FROM "collection_passages"
) AS "ordered"
WHERE "ordered"."collection_id" = "collection_passages"."collection_id"
	AND "ordered"."passage_id" = "collection_passages"."passage_id";--> statement-breakpoint
ALTER TABLE "collections" DROP CONSTRAINT "collections_cover_id_not_empty_check";--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "cover_id";--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "allowed_content";
