-- The old column pointed at a stored passage. Those links can't be rebuilt from a
-- book, chapter and verse, so the column comes back empty.
ALTER TABLE "reading_positions" ADD COLUMN IF NOT EXISTS "passage_id" integer;
--> statement-breakpoint
ALTER TABLE "reading_positions" ADD CONSTRAINT "reading_positions_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reading_positions" ALTER COLUMN "verse" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "reading_positions" ALTER COLUMN "chapter" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "reading_positions" ALTER COLUMN "book_id" DROP NOT NULL;
