-- Revisions from before this were tied to three commentary targets and can't carry
-- over. They are test data only, so they and what hangs off them are cleared.
TRUNCATE TABLE "content_revisions" CASCADE;--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "content_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kind" text NOT NULL,
	"scope_key" text NOT NULL,
	"title" text NOT NULL,
	"live_revision_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_items_kind_scope_unique" UNIQUE("kind","scope_key"),
	CONSTRAINT "content_items_title_not_blank_check" CHECK (btrim("content_items"."title") <> '')
);
--> statement-breakpoint
ALTER TABLE "content_issues" DROP CONSTRAINT "content_issues_closed_by_user_id_contributors_user_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_assignments" DROP CONSTRAINT "editorial_assignments_assignee_user_id_contributors_user_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_assignments" DROP CONSTRAINT "editorial_assignments_assigned_by_user_id_contributors_user_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_checks" DROP CONSTRAINT "editorial_checks_checked_by_user_id_contributors_user_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_reviews" DROP CONSTRAINT "editorial_reviews_reviewer_user_id_contributors_user_id_fk";
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "content_item_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "body" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "based_on_revision_id" integer;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "reviewer_user_id" text;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "published_by_user_id" text;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "editorial_assignments" ADD COLUMN "role" text DEFAULT 'reviewer' NOT NULL;--> statement-breakpoint
ALTER TABLE "editorial_checklists" ADD COLUMN "original_language_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "editorial_checks" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "publication_history" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_live_revision_id_content_revisions_id_fk" FOREIGN KEY ("live_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_issues" ADD CONSTRAINT "content_issues_closed_by_user_id_user_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_based_on_revision_id_content_revisions_id_fk" FOREIGN KEY ("based_on_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_published_by_user_id_user_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_assignments" ADD CONSTRAINT "editorial_assignments_assignee_user_id_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_assignments" ADD CONSTRAINT "editorial_assignments_assigned_by_user_id_user_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_checks" ADD CONSTRAINT "editorial_checks_checked_by_user_id_user_id_fk" FOREIGN KEY ("checked_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_reviews" ADD CONSTRAINT "editorial_reviews_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_revisions_one_open_idx" ON "content_revisions" USING btree ("content_item_id") WHERE "content_revisions"."status" IN ('draft', 'submitted', 'in_review', 'approved');--> statement-breakpoint
CREATE UNIQUE INDEX "content_revisions_one_published_idx" ON "content_revisions" USING btree ("content_item_id") WHERE "content_revisions"."status" = 'published';--> statement-breakpoint
CREATE INDEX "content_revisions_status_idx" ON "content_revisions" USING btree ("status");--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_item_number_unique" UNIQUE("content_item_id","number");--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_status_check" CHECK ("content_revisions"."status" IN (
				'draft',
				'submitted',
				'in_review',
				'changes_requested',
				'approved',
				'published',
				'superseded',
				'withdrawn'
			));--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_number_positive_check" CHECK ("content_revisions"."number" > 0);--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_second_person_check" CHECK ("content_revisions"."reviewer_user_id" IS NULL OR "content_revisions"."reviewer_user_id" <> "content_revisions"."created_by_user_id");--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_approved_has_reviewer_check" CHECK ("content_revisions"."status" NOT IN ('approved', 'published', 'superseded', 'withdrawn')
				OR ("content_revisions"."reviewer_user_id" IS NOT NULL AND "content_revisions"."approved_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_published_state_check" CHECK ("content_revisions"."status" NOT IN ('published', 'superseded', 'withdrawn')
				OR ("content_revisions"."published_at" IS NOT NULL AND "content_revisions"."published_by_user_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "editorial_assignments" ADD CONSTRAINT "editorial_assignments_role_check" CHECK ("editorial_assignments"."role" IN ('reviewer', 'writer'));
--> statement-breakpoint
CREATE FUNCTION keep_submitted_revision_fixed() RETURNS trigger
	LANGUAGE plpgsql AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		IF OLD.status <> 'draft' THEN
			RAISE EXCEPTION 'A submitted revision can''t be deleted.';
		END IF;
		RETURN OLD;
	END IF;
	IF OLD.status <> 'draft' AND (
		NEW.body IS DISTINCT FROM OLD.body
		OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
		OR NEW.content_item_id IS DISTINCT FROM OLD.content_item_id
		OR NEW.number IS DISTINCT FROM OLD.number
	) THEN
		RAISE EXCEPTION 'A submitted revision can''t be changed. Later edits become a new revision.';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER content_revisions_keep_submitted_fixed
	BEFORE UPDATE OR DELETE ON "content_revisions"
	FOR EACH ROW EXECUTE FUNCTION keep_submitted_revision_fixed();
