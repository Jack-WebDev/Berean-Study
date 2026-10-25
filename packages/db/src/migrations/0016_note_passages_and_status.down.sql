ALTER TABLE "notes" DROP CONSTRAINT "notes_saved_title_check";
--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT "notes_status_check";
--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "passage_id" integer;
--> statement-breakpoint
UPDATE "notes"
SET "passage_id" = "note_passages"."passage_id"
FROM "note_passages"
WHERE "note_passages"."note_id" = "notes"."id" AND "note_passages"."position" = 0;
--> statement-breakpoint
DROP INDEX "notes_user_id_idx";
--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "status";
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "notes_user_id_passage_id_idx" ON "notes" USING btree ("user_id","passage_id");
--> statement-breakpoint
DROP TABLE "note_passages";
