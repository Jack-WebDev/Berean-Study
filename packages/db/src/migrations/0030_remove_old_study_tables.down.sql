-- Written by hand, because dropped tables can't be reversed automatically. Their
-- old rows are gone, and anything written since then stays in content_revisions.
TRUNCATE TABLE "themes" CASCADE;
--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_name_not_empty_check" CHECK (btrim("themes"."name") <> '');--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_slug_not_empty_check" CHECK (btrim("themes"."slug") <> '');--> statement-breakpoint
CREATE TABLE "theme_relationships" (
	"source_theme_id" integer NOT NULL REFERENCES "themes"("id") ON DELETE cascade,
	"target_theme_id" integer NOT NULL REFERENCES "themes"("id") ON DELETE cascade,
	"relationship_type" text NOT NULL,
	CONSTRAINT "theme_relationships_source_theme_id_target_theme_id_relationship_type_pk" PRIMARY KEY("source_theme_id","target_theme_id","relationship_type"),
	CONSTRAINT "theme_relationships_different_themes" CHECK ("theme_relationships"."source_theme_id" <> "theme_relationships"."target_theme_id"),
	CONSTRAINT "theme_relationships_relationship_type_not_blank" CHECK (btrim("theme_relationships"."relationship_type") <> ''),
	CONSTRAINT "theme_relationships_relationship_type_valid" CHECK ("theme_relationships"."relationship_type" IN ('broader_than', 'narrower_than', 'related_to'))
);--> statement-breakpoint
CREATE INDEX "theme_relationships_target_theme_id_idx" ON "theme_relationships" USING btree ("target_theme_id");--> statement-breakpoint
CREATE TABLE "theme_passages" (
	"theme_id" integer NOT NULL REFERENCES "themes"("id") ON DELETE cascade,
	"passage_id" integer NOT NULL REFERENCES "passages"("id") ON DELETE restrict,
	CONSTRAINT "theme_passages_theme_id_passage_id_pk" PRIMARY KEY("theme_id","passage_id")
);--> statement-breakpoint
CREATE INDEX "theme_passages_passage_id_idx" ON "theme_passages" USING btree ("passage_id");--> statement-breakpoint
CREATE TABLE "textual_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
	"passage_id" integer NOT NULL REFERENCES "passages"("id") ON DELETE restrict,
	"content" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "textual_notes_passage_position_unique" UNIQUE("passage_id","position"),
	CONSTRAINT "textual_notes_content_not_empty_check" CHECK (btrim("textual_notes"."content") <> ''),
	CONSTRAINT "textual_notes_position_positive_check" CHECK ("textual_notes"."position" > 0)
);--> statement-breakpoint
CREATE TABLE "textual_variants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
	"textual_note_id" integer NOT NULL REFERENCES "textual_notes"("id") ON DELETE cascade,
	"reading" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "textual_variants_reading_not_blank" CHECK (btrim("textual_variants"."reading") <> ''),
	CONSTRAINT "textual_variants_position_positive" CHECK ("textual_variants"."position" > 0)
);--> statement-breakpoint
CREATE UNIQUE INDEX "textual_variants_note_position_unique" ON "textual_variants" USING btree ("textual_note_id","position");--> statement-breakpoint
CREATE TABLE "textual_variant_witnesses" (
	"textual_variant_id" integer NOT NULL REFERENCES "textual_variants"("id") ON DELETE cascade,
	"manuscript_id" integer NOT NULL REFERENCES "manuscripts"("id") ON DELETE restrict,
	CONSTRAINT "textual_variant_witnesses_textual_variant_id_manuscript_id_pk" PRIMARY KEY("textual_variant_id","manuscript_id")
);--> statement-breakpoint
CREATE INDEX "textual_variant_witnesses_manuscript_id_idx" ON "textual_variant_witnesses" USING btree ("manuscript_id");--> statement-breakpoint
CREATE TABLE "original_language_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
	"passage_id" integer NOT NULL REFERENCES "passages"("id") ON DELETE restrict,
	"content" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "original_language_notes_passage_position_unique" UNIQUE("passage_id","position"),
	CONSTRAINT "original_language_notes_content_not_empty_check" CHECK (btrim("original_language_notes"."content") <> ''),
	CONSTRAINT "original_language_notes_position_positive_check" CHECK ("original_language_notes"."position" > 0)
);--> statement-breakpoint
CREATE TABLE "interpretive_questions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
	"passage_id" integer NOT NULL REFERENCES "passages"("id") ON DELETE restrict,
	"question" text NOT NULL,
	CONSTRAINT "interpretive_questions_question_not_empty_check" CHECK (btrim("interpretive_questions"."question") <> '')
);--> statement-breakpoint
CREATE INDEX "interpretive_questions_passage_id_idx" ON "interpretive_questions" USING btree ("passage_id");--> statement-breakpoint
CREATE TABLE "interpretation_views" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
	"interpretive_question_id" integer NOT NULL REFERENCES "interpretive_questions"("id") ON DELETE cascade,
	"name" text NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT "interpretation_views_name_not_empty_check" CHECK (btrim("interpretation_views"."name") <> ''),
	CONSTRAINT "interpretation_views_content_not_empty_check" CHECK (btrim("interpretation_views"."content") <> '')
);--> statement-breakpoint
CREATE INDEX "interpretation_views_interpretive_question_id_idx" ON "interpretation_views" USING btree ("interpretive_question_id");--> statement-breakpoint
CREATE TABLE "cross_references" (
	"passage_id" integer NOT NULL REFERENCES "passages"("id") ON DELETE restrict,
	"related_passage_id" integer NOT NULL REFERENCES "passages"("id") ON DELETE restrict,
	"explanation" text NOT NULL,
	CONSTRAINT "cross_references_passage_id_related_passage_id_pk" PRIMARY KEY("passage_id","related_passage_id"),
	CONSTRAINT "cross_references_no_self_reference_check" CHECK ("cross_references"."passage_id" <> "cross_references"."related_passage_id"),
	CONSTRAINT "cross_references_explanation_not_empty_check" CHECK (btrim("cross_references"."explanation") <> '')
);--> statement-breakpoint
CREATE INDEX "cross_references_related_passage_id_idx" ON "cross_references" USING btree ("related_passage_id");--> statement-breakpoint
CREATE TABLE "canonical_relationships" (
	"source_passage_id" integer NOT NULL REFERENCES "passages"("id") ON DELETE restrict,
	"target_passage_id" integer NOT NULL REFERENCES "passages"("id") ON DELETE restrict,
	"relationship_type" text NOT NULL,
	"explanation" text NOT NULL,
	CONSTRAINT "canonical_relationships_source_passage_id_target_passage_id_relationship_type_pk" PRIMARY KEY("source_passage_id","target_passage_id","relationship_type"),
	CONSTRAINT "canonical_relationships_no_self_reference_check" CHECK ("canonical_relationships"."source_passage_id" <> "canonical_relationships"."target_passage_id"),
	CONSTRAINT "canonical_relationships_relationship_type_not_empty_check" CHECK (btrim("canonical_relationships"."relationship_type") <> ''),
	CONSTRAINT "canonical_relationships_explanation_not_empty_check" CHECK (btrim("canonical_relationships"."explanation") <> '')
);--> statement-breakpoint
CREATE INDEX "canonical_relationships_target_passage_id_idx" ON "canonical_relationships" USING btree ("target_passage_id");
