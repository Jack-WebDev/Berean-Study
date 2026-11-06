-- The old permission codes aren't restored; re-seed the database after rolling back.
DROP TRIGGER IF EXISTS audit_log_append_only ON "audit_log";
--> statement-breakpoint
DROP FUNCTION IF EXISTS reject_audit_log_change();
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_actor_role_not_blank_check";
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_domain_check";
--> statement-breakpoint
DROP INDEX IF EXISTS "audit_log_domain_history_idx";
--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN IF EXISTS "locked";
--> statement-breakpoint
ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "domain";
--> statement-breakpoint
ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "actor_role";
