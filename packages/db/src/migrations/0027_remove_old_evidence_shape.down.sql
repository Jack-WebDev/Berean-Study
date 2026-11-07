-- Written by hand, because dropped tables and columns can't be reversed automatically.
-- The old rows can't be restored, so whatever these tables hold is cleared first.
TRUNCATE TABLE "citations", "claim_usages", "research_note_sources", "research_notes", "source_excerpts", "claims", "sources";
--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "title" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "type" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "publication_year" integer;
--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_title_not_empty_check" CHECK (btrim("sources"."title") <> '');
--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_type_not_empty_check" CHECK (btrim("sources"."type") <> '');
--> statement-breakpoint
ALTER TABLE "source_excerpts" ADD COLUMN "locator" text;
--> statement-breakpoint
ALTER TABLE "source_excerpts" ADD COLUMN "text" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "source_excerpts" ADD CONSTRAINT "source_excerpts_locator_not_empty_check" CHECK ("source_excerpts"."locator" IS NULL OR btrim("source_excerpts"."locator") <> '');
--> statement-breakpoint
ALTER TABLE "source_excerpts" ADD CONSTRAINT "source_excerpts_text_not_empty_check" CHECK (btrim("source_excerpts"."text") <> '');
--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "statement" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "status" text DEFAULT 'unverified' NOT NULL;
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_statement_not_empty_check" CHECK (btrim("claims"."statement") <> '');
--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_status_check" CHECK ("claims"."status" IN ('unverified', 'verified', 'rejected'));
--> statement-breakpoint
ALTER TABLE "research_notes" ADD COLUMN "passage_id" integer;
--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_target_check" CHECK (num_nonnulls("research_notes"."book_id", "research_notes"."passage_id") = 1);
--> statement-breakpoint
CREATE INDEX "research_notes_passage_id_idx" ON "research_notes" USING btree ("passage_id") WHERE "research_notes"."passage_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "citations" ADD COLUMN "source_id" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "citations_source_id_index" ON "citations" USING btree ("source_id");
--> statement-breakpoint
CREATE TABLE "credited_people" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "credited_people_name_not_empty_check" CHECK (btrim("credited_people"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "source_credits" (
	"source_id" integer NOT NULL REFERENCES "sources"("id") ON DELETE cascade,
	"credited_person_id" integer NOT NULL REFERENCES "credited_people"("id") ON DELETE restrict,
	"role" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "source_credits_pk" PRIMARY KEY("source_id","credited_person_id","role"),
	CONSTRAINT "source_credits_source_position_unique" UNIQUE("source_id","position"),
	CONSTRAINT "source_credits_role_not_empty_check" CHECK (btrim("source_credits"."role") <> ''),
	CONSTRAINT "source_credits_position_positive_check" CHECK ("source_credits"."position" > 0)
);
--> statement-breakpoint
CREATE INDEX "source_credits_credited_person_id_idx" ON "source_credits" USING btree ("credited_person_id");
--> statement-breakpoint
CREATE TABLE "source_links" (
	"source_id" integer NOT NULL REFERENCES "sources"("id") ON DELETE cascade,
	"url" text NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "source_links_pkey" PRIMARY KEY("source_id","url"),
	CONSTRAINT "source_links_url_not_empty_check" CHECK (btrim("source_links"."url") <> ''),
	CONSTRAINT "source_links_kind_not_empty_check" CHECK (btrim("source_links"."kind") <> '')
);
--> statement-breakpoint
CREATE TABLE "claim_sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
	"claim_id" integer NOT NULL REFERENCES "claims"("id") ON DELETE cascade,
	"source_id" integer NOT NULL REFERENCES "sources"("id") ON DELETE restrict,
	"relationship" text NOT NULL,
	"locator" text,
	CONSTRAINT "claim_sources_relationship_check" CHECK ("claim_sources"."relationship" IN ('supports', 'disputes', 'discusses')),
	CONSTRAINT "claim_sources_locator_not_empty_check" CHECK ("claim_sources"."locator" IS NULL OR btrim("claim_sources"."locator") <> '')
);
--> statement-breakpoint
CREATE INDEX "claim_sources_claim_id_idx" ON "claim_sources" USING btree ("claim_id");
--> statement-breakpoint
CREATE INDEX "claim_sources_source_id_idx" ON "claim_sources" USING btree ("source_id");
