ALTER TABLE "citations" DROP CONSTRAINT "citations_content_revision_id_content_revisions_id_fk";
--> statement-breakpoint
DROP INDEX "citations_content_revision_id_index";--> statement-breakpoint
DROP INDEX "research_notes_book_id_idx";--> statement-breakpoint
ALTER TABLE "research_notes" ALTER COLUMN "book_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "citations" ADD COLUMN "position" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "citations" ADD COLUMN "excerpt_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "citations" ADD COLUMN "strength" text NOT NULL;--> statement-breakpoint
ALTER TABLE "citations" ADD COLUMN "pinned_excerpt_revision_id" integer;--> statement-breakpoint
ALTER TABLE "citations" ADD COLUMN "pinned_source_revision_id" integer;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "created_by_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "research_notes" ADD COLUMN "reference" text NOT NULL;--> statement-breakpoint
ALTER TABLE "research_notes" ADD COLUMN "created_by_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "research_notes" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "research_notes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "source_excerpts" ADD COLUMN "created_by_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "source_excerpts" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "merged_into_source_id" integer;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "retired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "created_by_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_excerpt_id_source_excerpts_id_fk" FOREIGN KEY ("excerpt_id") REFERENCES "public"."source_excerpts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_pinned_excerpt_revision_id_content_revisions_id_fk" FOREIGN KEY ("pinned_excerpt_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_pinned_source_revision_id_content_revisions_id_fk" FOREIGN KEY ("pinned_source_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_content_revision_id_content_revisions_id_fk" FOREIGN KEY ("content_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_excerpts" ADD CONSTRAINT "source_excerpts_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_merged_into_source_id_sources_id_fk" FOREIGN KEY ("merged_into_source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "citations_excerpt_id_index" ON "citations" USING btree ("excerpt_id");--> statement-breakpoint
CREATE INDEX "research_notes_book_id_idx" ON "research_notes" USING btree ("book_id");--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_revision_position_unique" UNIQUE("content_revision_id","position");--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_strength_check" CHECK ("citations"."strength" IN ('direct', 'partial', 'background'));--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_position_positive_check" CHECK ("citations"."position" > 0);--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_reference_not_empty_check" CHECK (btrim("research_notes"."reference") <> '');--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_status_check" CHECK ("sources"."status" IN ('active', 'merged', 'retired'));--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_merged_has_target_check" CHECK (("sources"."status" = 'merged') = ("sources"."merged_into_source_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_retired_has_date_check" CHECK (("sources"."status" = 'retired') = ("sources"."retired_at" IS NOT NULL));