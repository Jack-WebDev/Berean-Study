ALTER TABLE "notes" DROP CONSTRAINT "notes_collection_id_user_note_collections_id_fk";
--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "collection_id";
--> statement-breakpoint
ALTER TABLE "user_note_collections" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP TABLE "user_note_collections";
