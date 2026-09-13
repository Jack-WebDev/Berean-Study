ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "notes_collection_id_user_note_collections_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "note_tag_assignments_tag_id_note_id_idx";
--> statement-breakpoint
ALTER TABLE "user_note_tags" DROP CONSTRAINT IF EXISTS "user_note_tags_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "note_tag_assignments" DROP CONSTRAINT IF EXISTS "note_tag_assignments_tag_id_user_note_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "note_tag_assignments" DROP CONSTRAINT IF EXISTS "note_tag_assignments_note_id_notes_id_fk";
--> statement-breakpoint
ALTER TABLE "user_note_collections" DROP CONSTRAINT IF EXISTS "user_note_collections_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "collection_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "user_note_tags";
--> statement-breakpoint
DROP TABLE IF EXISTS "note_tag_assignments";
--> statement-breakpoint
DROP TABLE IF EXISTS "user_note_collections";
