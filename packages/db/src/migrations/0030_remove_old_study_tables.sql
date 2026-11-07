-- A theme's name and everything it says now lives in reviewed revisions, which old
-- rows don't have. These tables only ever held test data.
TRUNCATE TABLE "themes" CASCADE;
--> statement-breakpoint
ALTER TABLE "canonical_relationships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cross_references" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "interpretation_views" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "interpretive_questions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "original_language_notes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "textual_notes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "textual_variant_witnesses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "textual_variants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "theme_passages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "theme_relationships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "canonical_relationships" CASCADE;--> statement-breakpoint
DROP TABLE "cross_references" CASCADE;--> statement-breakpoint
DROP TABLE "interpretation_views" CASCADE;--> statement-breakpoint
DROP TABLE "interpretive_questions" CASCADE;--> statement-breakpoint
DROP TABLE "original_language_notes" CASCADE;--> statement-breakpoint
DROP TABLE "textual_notes" CASCADE;--> statement-breakpoint
DROP TABLE "textual_variant_witnesses" CASCADE;--> statement-breakpoint
DROP TABLE "textual_variants" CASCADE;--> statement-breakpoint
DROP TABLE "theme_passages" CASCADE;--> statement-breakpoint
DROP TABLE "theme_relationships" CASCADE;--> statement-breakpoint
ALTER TABLE "themes" DROP CONSTRAINT "themes_name_unique";--> statement-breakpoint
ALTER TABLE "themes" DROP CONSTRAINT "themes_slug_unique";--> statement-breakpoint
ALTER TABLE "themes" DROP CONSTRAINT "themes_name_not_empty_check";--> statement-breakpoint
ALTER TABLE "themes" DROP CONSTRAINT "themes_slug_not_empty_check";--> statement-breakpoint
ALTER TABLE "themes" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "themes" DROP COLUMN "slug";