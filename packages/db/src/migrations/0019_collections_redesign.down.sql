-- Photo covers and the content checklist can't be recovered; every collection
-- gets the first photo cover and accepts all content again.
ALTER TABLE "collections" ADD COLUMN "cover_id" text DEFAULT 'mountains' NOT NULL;
--> statement-breakpoint
ALTER TABLE "collections" ALTER COLUMN "cover_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "allowed_content" text[] DEFAULT ARRAY['passages', 'notes', 'highlights', 'study-themes']::text[] NOT NULL;
--> statement-breakpoint
ALTER TABLE "collections" ALTER COLUMN "allowed_content" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_cover_id_not_empty_check" CHECK (btrim("collections"."cover_id") <> '');
--> statement-breakpoint
ALTER TABLE "collections" DROP CONSTRAINT IF EXISTS "collections_color_check";
--> statement-breakpoint
ALTER TABLE "collections" DROP CONSTRAINT IF EXISTS "collections_visibility_check";
--> statement-breakpoint
ALTER TABLE "collections" DROP CONSTRAINT IF EXISTS "collections_type_check";
--> statement-breakpoint
ALTER TABLE "collection_passages" DROP CONSTRAINT IF EXISTS "collection_passages_position_check";
--> statement-breakpoint
DROP INDEX IF EXISTS "collection_passages_section_id_idx";
--> statement-breakpoint
ALTER TABLE "collection_passages" DROP CONSTRAINT IF EXISTS "collection_passages_section_id_collection_sections_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "collection_sections_collection_id_position_idx";
--> statement-breakpoint
ALTER TABLE "collection_sections" DROP CONSTRAINT IF EXISTS "collection_sections_collection_id_collections_id_fk";
--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN IF EXISTS "last_opened_at";
--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN IF EXISTS "pinned_at";
--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN IF EXISTS "visibility";
--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN IF EXISTS "color";
--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN IF EXISTS "type";
--> statement-breakpoint
ALTER TABLE "collection_passages" DROP COLUMN IF EXISTS "added_at";
--> statement-breakpoint
ALTER TABLE "collection_passages" DROP COLUMN IF EXISTS "read_at";
--> statement-breakpoint
ALTER TABLE "collection_passages" DROP COLUMN IF EXISTS "position";
--> statement-breakpoint
ALTER TABLE "collection_passages" DROP COLUMN IF EXISTS "section_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "collection_sections";
