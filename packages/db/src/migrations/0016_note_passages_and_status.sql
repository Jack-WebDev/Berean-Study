CREATE TABLE "note_passages" (
	"note_id" integer NOT NULL,
	"passage_id" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "note_passages_note_id_passage_id_pk" PRIMARY KEY("note_id","passage_id"),
	CONSTRAINT "note_passages_position_check" CHECK ("note_passages"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT "notes_passage_id_passages_id_fk";
--> statement-breakpoint
DROP INDEX "notes_user_id_passage_id_idx";--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "note_passages" ADD CONSTRAINT "note_passages_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_passages" ADD CONSTRAINT "note_passages_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_passages_passage_id_idx" ON "note_passages" USING btree ("passage_id");--> statement-breakpoint
CREATE INDEX "notes_user_id_idx" ON "notes" USING btree ("user_id");--> statement-breakpoint
INSERT INTO "note_passages" ("note_id", "passage_id", "position")
SELECT "id", "passage_id", 0 FROM "notes" WHERE "passage_id" IS NOT NULL;--> statement-breakpoint
UPDATE "notes" SET "status" = 'saved' WHERE btrim("title") <> '';--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "passage_id";--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_status_check" CHECK ("notes"."status" IN ('draft', 'saved'));--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_saved_title_check" CHECK ("notes"."status" = 'draft' OR btrim("notes"."title") <> '');