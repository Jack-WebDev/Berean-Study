CREATE TABLE "user_note_collections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_note_collections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	CONSTRAINT "user_note_collections_user_id_normalized_name_unique" UNIQUE("user_id","normalized_name"),
	CONSTRAINT "user_note_collections_name_not_empty_check" CHECK (btrim("user_note_collections"."name") <> ''),
	CONSTRAINT "user_note_collections_normalized_name_not_empty_check" CHECK (btrim("user_note_collections"."normalized_name") <> '')
);
--> statement-breakpoint
CREATE TABLE "note_tag_assignments" (
	"note_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "note_tag_assignments_note_id_tag_id_pk" PRIMARY KEY("note_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "user_note_tags" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_note_tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	CONSTRAINT "user_note_tags_user_id_normalized_name_unique" UNIQUE("user_id","normalized_name"),
	CONSTRAINT "user_note_tags_name_not_empty_check" CHECK (btrim("user_note_tags"."name") <> ''),
	CONSTRAINT "user_note_tags_normalized_name_not_empty_check" CHECK (btrim("user_note_tags"."normalized_name") <> '')
);
--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "collection_id" integer;--> statement-breakpoint
ALTER TABLE "user_note_collections" ADD CONSTRAINT "user_note_collections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tag_assignments" ADD CONSTRAINT "note_tag_assignments_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tag_assignments" ADD CONSTRAINT "note_tag_assignments_tag_id_user_note_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."user_note_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_tags" ADD CONSTRAINT "user_note_tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_tag_assignments_tag_id_note_id_idx" ON "note_tag_assignments" USING btree ("tag_id","note_id");--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_collection_id_user_note_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."user_note_collections"("id") ON DELETE set null ON UPDATE no action;