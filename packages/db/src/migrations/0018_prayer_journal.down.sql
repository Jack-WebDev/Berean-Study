DROP INDEX IF EXISTS "prayer_reflections_user_created_at_idx";
--> statement-breakpoint
ALTER TABLE "prayer_reflections" DROP CONSTRAINT IF EXISTS "prayer_reflections_prayer_id_prayers_id_fk";
--> statement-breakpoint
ALTER TABLE "prayer_reflections" DROP CONSTRAINT IF EXISTS "prayer_reflections_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "reflection_passages_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "prayer_updates_prayer_id_created_at_idx";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "reflection_reminders_enabled";
--> statement-breakpoint
ALTER TABLE "testimonies" DROP COLUMN IF EXISTS "search_text";
--> statement-breakpoint
ALTER TABLE "testimonies" DROP COLUMN IF EXISTS "happened_on";
--> statement-breakpoint
ALTER TABLE "prayers" DROP COLUMN IF EXISTS "search_text";
--> statement-breakpoint
ALTER TABLE "prayers" DROP COLUMN IF EXISTS "praying_for";
--> statement-breakpoint
ALTER TABLE "prayer_reflections" DROP COLUMN IF EXISTS "search_text";
--> statement-breakpoint
ALTER TABLE "prayer_reflections" DROP COLUMN IF EXISTS "prompt";
--> statement-breakpoint
ALTER TABLE "prayer_reflections" DROP COLUMN IF EXISTS "user_id";
--> statement-breakpoint
-- The old schema requires every reflection to belong to a prayer. Free
-- reflections (and ones whose prayer was deleted) can't be kept, so rolling
-- back deletes them.
DELETE FROM "prayer_reflections" WHERE "prayer_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "prayer_reflections" ALTER COLUMN "prayer_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "prayer_reflections" ADD CONSTRAINT "prayer_reflections_prayer_id_prayers_id_fk" FOREIGN KEY ("prayer_id") REFERENCES "public"."prayers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP TABLE IF EXISTS "reflection_passages";
--> statement-breakpoint
DROP TABLE IF EXISTS "prayer_updates";
