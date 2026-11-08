ALTER TABLE "reading_positions" DROP CONSTRAINT "reading_positions_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "reading_positions" ALTER COLUMN "book_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_positions" ALTER COLUMN "chapter" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_positions" ALTER COLUMN "verse" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_positions" DROP COLUMN "passage_id";