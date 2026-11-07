DROP TRIGGER IF EXISTS content_revisions_keep_submitted_fixed ON "content_revisions";
--> statement-breakpoint
DROP FUNCTION IF EXISTS keep_submitted_revision_fixed();
--> statement-breakpoint
ALTER TABLE "editorial_assignments" DROP CONSTRAINT IF EXISTS "editorial_assignments_role_check";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_published_state_check";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_approved_has_reviewer_check";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_second_person_check";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_number_positive_check";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_status_check";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_item_number_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "content_revisions_status_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "content_revisions_one_published_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "content_revisions_one_open_idx";
--> statement-breakpoint
ALTER TABLE "editorial_reviews" DROP CONSTRAINT IF EXISTS "editorial_reviews_reviewer_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_checks" DROP CONSTRAINT IF EXISTS "editorial_checks_checked_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_assignments" DROP CONSTRAINT IF EXISTS "editorial_assignments_assigned_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_assignments" DROP CONSTRAINT IF EXISTS "editorial_assignments_assignee_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_published_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_reviewer_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_based_on_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_content_item_id_content_items_id_fk";
--> statement-breakpoint
ALTER TABLE "content_issues" DROP CONSTRAINT IF EXISTS "content_issues_closed_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "content_items" DROP CONSTRAINT IF EXISTS "content_items_live_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "publication_history" DROP COLUMN IF EXISTS "reason";
--> statement-breakpoint
ALTER TABLE "editorial_checks" DROP COLUMN IF EXISTS "note";
--> statement-breakpoint
ALTER TABLE "editorial_checklists" DROP COLUMN IF EXISTS "original_language_only";
--> statement-breakpoint
ALTER TABLE "editorial_assignments" DROP COLUMN IF EXISTS "role";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN IF EXISTS "updated_at";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN IF EXISTS "published_by_user_id";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN IF EXISTS "published_at";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN IF EXISTS "approved_at";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN IF EXISTS "submitted_at";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN IF EXISTS "reviewer_user_id";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN IF EXISTS "based_on_revision_id";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN IF EXISTS "status";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN IF EXISTS "body";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN IF EXISTS "number";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP COLUMN IF EXISTS "content_item_id";
--> statement-breakpoint
ALTER TABLE "editorial_reviews" ADD CONSTRAINT "editorial_reviews_reviewer_user_id_contributors_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "contributors"("user_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "editorial_checks" ADD CONSTRAINT "editorial_checks_checked_by_user_id_contributors_user_id_fk" FOREIGN KEY ("checked_by_user_id") REFERENCES "contributors"("user_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "editorial_assignments" ADD CONSTRAINT "editorial_assignments_assigned_by_user_id_contributors_user_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "contributors"("user_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "editorial_assignments" ADD CONSTRAINT "editorial_assignments_assignee_user_id_contributors_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "contributors"("user_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_issues" ADD CONSTRAINT "content_issues_closed_by_user_id_contributors_user_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "contributors"("user_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
DROP TABLE IF EXISTS "content_items";
