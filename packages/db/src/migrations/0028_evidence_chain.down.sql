ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "sources_retired_has_date_check";
--> statement-breakpoint
ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "sources_merged_has_target_check";
--> statement-breakpoint
ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "sources_status_check";
--> statement-breakpoint
ALTER TABLE "research_notes" DROP CONSTRAINT IF EXISTS "research_notes_reference_not_empty_check";
--> statement-breakpoint
ALTER TABLE "citations" DROP CONSTRAINT IF EXISTS "citations_position_positive_check";
--> statement-breakpoint
ALTER TABLE "citations" DROP CONSTRAINT IF EXISTS "citations_strength_check";
--> statement-breakpoint
ALTER TABLE "citations" DROP CONSTRAINT IF EXISTS "citations_revision_position_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "research_notes_book_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "citations_excerpt_id_index";
--> statement-breakpoint
ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "sources_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "sources_merged_into_source_id_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "source_excerpts" DROP CONSTRAINT IF EXISTS "source_excerpts_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "research_notes" DROP CONSTRAINT IF EXISTS "research_notes_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "claims" DROP CONSTRAINT IF EXISTS "claims_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "citations" DROP CONSTRAINT IF EXISTS "citations_content_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "citations" DROP CONSTRAINT IF EXISTS "citations_pinned_source_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "citations" DROP CONSTRAINT IF EXISTS "citations_pinned_excerpt_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "citations" DROP CONSTRAINT IF EXISTS "citations_excerpt_id_source_excerpts_id_fk";
--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN IF EXISTS "created_at";
--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN IF EXISTS "created_by_user_id";
--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN IF EXISTS "retired_at";
--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN IF EXISTS "merged_into_source_id";
--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN IF EXISTS "status";
--> statement-breakpoint
ALTER TABLE "source_excerpts" DROP COLUMN IF EXISTS "created_at";
--> statement-breakpoint
ALTER TABLE "source_excerpts" DROP COLUMN IF EXISTS "created_by_user_id";
--> statement-breakpoint
ALTER TABLE "research_notes" DROP COLUMN IF EXISTS "updated_at";
--> statement-breakpoint
ALTER TABLE "research_notes" DROP COLUMN IF EXISTS "created_at";
--> statement-breakpoint
ALTER TABLE "research_notes" DROP COLUMN IF EXISTS "created_by_user_id";
--> statement-breakpoint
ALTER TABLE "research_notes" DROP COLUMN IF EXISTS "reference";
--> statement-breakpoint
ALTER TABLE "claims" DROP COLUMN IF EXISTS "created_at";
--> statement-breakpoint
ALTER TABLE "claims" DROP COLUMN IF EXISTS "created_by_user_id";
--> statement-breakpoint
ALTER TABLE "citations" DROP COLUMN IF EXISTS "pinned_source_revision_id";
--> statement-breakpoint
ALTER TABLE "citations" DROP COLUMN IF EXISTS "pinned_excerpt_revision_id";
--> statement-breakpoint
ALTER TABLE "citations" DROP COLUMN IF EXISTS "strength";
--> statement-breakpoint
ALTER TABLE "citations" DROP COLUMN IF EXISTS "excerpt_id";
--> statement-breakpoint
ALTER TABLE "citations" DROP COLUMN IF EXISTS "position";
--> statement-breakpoint
ALTER TABLE "research_notes" ALTER COLUMN "book_id" DROP NOT NULL;
--> statement-breakpoint
CREATE INDEX "research_notes_book_id_idx" ON "public"."research_notes" USING btree ("book_id") WHERE "research_notes"."book_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "citations_content_revision_id_index" ON "public"."citations" USING btree ("content_revision_id");
--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_content_revision_id_content_revisions_id_fk" FOREIGN KEY ("content_revision_id") REFERENCES "content_revisions"("id") ON DELETE restrict ON UPDATE no action;
