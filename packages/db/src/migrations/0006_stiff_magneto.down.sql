DROP INDEX IF EXISTS "collections_user_id_updated_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "collection_passages_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "collection_notes_note_id_idx";
--> statement-breakpoint
ALTER TABLE "collections" DROP CONSTRAINT IF EXISTS "collections_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "collection_passages" DROP CONSTRAINT IF EXISTS "collection_passages_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "collection_passages" DROP CONSTRAINT IF EXISTS "collection_passages_collection_id_collections_id_fk";
--> statement-breakpoint
ALTER TABLE "collection_notes" DROP CONSTRAINT IF EXISTS "collection_notes_note_id_notes_id_fk";
--> statement-breakpoint
ALTER TABLE "collection_notes" DROP CONSTRAINT IF EXISTS "collection_notes_collection_id_collections_id_fk";
--> statement-breakpoint
DROP TABLE IF EXISTS "collections";
--> statement-breakpoint
DROP TABLE IF EXISTS "collection_passages";
--> statement-breakpoint
DROP TABLE IF EXISTS "collection_notes";
