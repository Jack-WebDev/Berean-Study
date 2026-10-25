ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "notes_purpose_check";
--> statement-breakpoint
DROP INDEX IF EXISTS "note_versions_note_id_created_at_idx";
--> statement-breakpoint
ALTER TABLE "note_versions" DROP CONSTRAINT IF EXISTS "note_versions_note_id_notes_id_fk";
--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "search_text";
--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "pinned_at";
--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "purpose";
--> statement-breakpoint
DROP TABLE IF EXISTS "note_versions";
