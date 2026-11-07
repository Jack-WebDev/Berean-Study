-- The new shape keeps each record's wording in reviewed revisions and needs to know
-- who created it, which old rows can't say. These tables only ever held test data.
TRUNCATE TABLE "citations", "claim_usages", "claim_sources", "research_note_sources", "research_notes", "source_excerpts", "source_credits", "source_links", "claims", "sources", "credited_people";
--> statement-breakpoint
ALTER TABLE "claim_sources" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "credited_people" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "source_credits" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "source_links" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "claim_sources" CASCADE;--> statement-breakpoint
DROP TABLE "credited_people" CASCADE;--> statement-breakpoint
DROP TABLE "source_credits" CASCADE;--> statement-breakpoint
DROP TABLE "source_links" CASCADE;--> statement-breakpoint
ALTER TABLE "claims" DROP CONSTRAINT "claims_statement_not_empty_check";--> statement-breakpoint
ALTER TABLE "claims" DROP CONSTRAINT "claims_status_check";--> statement-breakpoint
ALTER TABLE "research_notes" DROP CONSTRAINT "research_notes_target_check";--> statement-breakpoint
ALTER TABLE "source_excerpts" DROP CONSTRAINT "source_excerpts_locator_not_empty_check";--> statement-breakpoint
ALTER TABLE "source_excerpts" DROP CONSTRAINT "source_excerpts_text_not_empty_check";--> statement-breakpoint
ALTER TABLE "sources" DROP CONSTRAINT "sources_title_not_empty_check";--> statement-breakpoint
ALTER TABLE "sources" DROP CONSTRAINT "sources_type_not_empty_check";--> statement-breakpoint
ALTER TABLE "citations" DROP CONSTRAINT "citations_source_id_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "research_notes" DROP CONSTRAINT "research_notes_passage_id_passages_id_fk";
--> statement-breakpoint
DROP INDEX "citations_source_id_index";--> statement-breakpoint
DROP INDEX "research_notes_passage_id_idx";--> statement-breakpoint
ALTER TABLE "citations" DROP COLUMN "source_id";--> statement-breakpoint
ALTER TABLE "claims" DROP COLUMN "statement";--> statement-breakpoint
ALTER TABLE "claims" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "research_notes" DROP COLUMN "passage_id";--> statement-breakpoint
ALTER TABLE "source_excerpts" DROP COLUMN "locator";--> statement-breakpoint
ALTER TABLE "source_excerpts" DROP COLUMN "text";--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN "publication_year";