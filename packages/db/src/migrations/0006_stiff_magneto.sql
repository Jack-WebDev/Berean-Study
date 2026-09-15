CREATE TABLE "collection_notes" (
	"collection_id" integer NOT NULL,
	"note_id" integer NOT NULL,
	CONSTRAINT "collection_notes_collection_id_note_id_pk" PRIMARY KEY("collection_id","note_id")
);
--> statement-breakpoint
CREATE TABLE "collection_passages" (
	"collection_id" integer NOT NULL,
	"passage_id" integer NOT NULL,
	CONSTRAINT "collection_passages_collection_id_passage_id_pk" PRIMARY KEY("collection_id","passage_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "collections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_id" text NOT NULL,
	"allowed_content" text[] NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collections_user_id_normalized_name_unique" UNIQUE("user_id","normalized_name"),
	CONSTRAINT "collections_name_not_empty_check" CHECK (btrim("collections"."name") <> ''),
	CONSTRAINT "collections_normalized_name_not_empty_check" CHECK (btrim("collections"."normalized_name") <> ''),
	CONSTRAINT "collections_cover_id_not_empty_check" CHECK (btrim("collections"."cover_id") <> '')
);
--> statement-breakpoint
ALTER TABLE "collection_notes" ADD CONSTRAINT "collection_notes_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_notes" ADD CONSTRAINT "collection_notes_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_passages" ADD CONSTRAINT "collection_passages_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_passages" ADD CONSTRAINT "collection_passages_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_notes_note_id_idx" ON "collection_notes" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "collection_passages_passage_id_idx" ON "collection_passages" USING btree ("passage_id");--> statement-breakpoint
CREATE INDEX "collections_user_id_updated_at_idx" ON "collections" USING btree ("user_id","updated_at");