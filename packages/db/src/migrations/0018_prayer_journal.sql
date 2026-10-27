CREATE TABLE "prayer_updates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "prayer_updates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"prayer_id" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prayer_updates_text_not_blank" CHECK (btrim("prayer_updates"."text") <> '')
);
--> statement-breakpoint
CREATE TABLE "reflection_passages" (
	"reflection_id" integer NOT NULL,
	"passage_id" integer NOT NULL,
	CONSTRAINT "reflection_passages_reflection_id_passage_id_pk" PRIMARY KEY("reflection_id","passage_id")
);
--> statement-breakpoint
ALTER TABLE "prayer_reflections" DROP CONSTRAINT "prayer_reflections_prayer_id_prayers_id_fk";
--> statement-breakpoint
ALTER TABLE "prayer_reflections" ALTER COLUMN "prayer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prayer_reflections" ADD COLUMN "user_id" text;--> statement-breakpoint
-- Every existing reflection belongs to a prayer, so it takes that prayer's owner.
UPDATE "prayer_reflections" SET "user_id" = "prayers"."user_id" FROM "prayers" WHERE "prayers"."id" = "prayer_reflections"."prayer_id";--> statement-breakpoint
ALTER TABLE "prayer_reflections" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prayer_reflections" ADD COLUMN "prompt" text;--> statement-breakpoint
ALTER TABLE "prayer_reflections" ADD COLUMN "search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "prayers" ADD COLUMN "praying_for" text;--> statement-breakpoint
ALTER TABLE "prayers" ADD COLUMN "search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "testimonies" ADD COLUMN "happened_on" date;--> statement-breakpoint
ALTER TABLE "testimonies" ADD COLUMN "search_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "reflection_reminders_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "prayer_updates" ADD CONSTRAINT "prayer_updates_prayer_id_prayers_id_fk" FOREIGN KEY ("prayer_id") REFERENCES "public"."prayers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_passages" ADD CONSTRAINT "reflection_passages_reflection_id_prayer_reflections_id_fk" FOREIGN KEY ("reflection_id") REFERENCES "public"."prayer_reflections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_passages" ADD CONSTRAINT "reflection_passages_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prayer_updates_prayer_id_created_at_idx" ON "prayer_updates" USING btree ("prayer_id","created_at");--> statement-breakpoint
CREATE INDEX "reflection_passages_passage_id_idx" ON "reflection_passages" USING btree ("passage_id");--> statement-breakpoint
ALTER TABLE "prayer_reflections" ADD CONSTRAINT "prayer_reflections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_reflections" ADD CONSTRAINT "prayer_reflections_prayer_id_prayers_id_fk" FOREIGN KEY ("prayer_id") REFERENCES "public"."prayers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prayer_reflections_user_created_at_idx" ON "prayer_reflections" USING btree ("user_id","created_at");--> statement-breakpoint
-- Fill search_text for existing entries from every text node in the stored body.
UPDATE "prayers" SET "search_text" = coalesce((
	SELECT string_agg(t #>> '{}', ' ')
	FROM jsonb_path_query("prayers"."content"::jsonb, 'strict $.** ? (@.type == "text").text') AS t
), '');--> statement-breakpoint
UPDATE "prayer_reflections" SET "search_text" = coalesce((
	SELECT string_agg(t #>> '{}', ' ')
	FROM jsonb_path_query("prayer_reflections"."content"::jsonb, 'strict $.** ? (@.type == "text").text') AS t
), '');--> statement-breakpoint
UPDATE "testimonies" SET "search_text" = coalesce((
	SELECT string_agg(t #>> '{}', ' ')
	FROM jsonb_path_query("testimonies"."content"::jsonb, 'strict $.** ? (@.type == "text").text') AS t
), '');
