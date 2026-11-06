ALTER TABLE "audit_log" ADD COLUMN "actor_role" text;--> statement-breakpoint
-- Existing rows are test data, so any valid area will do; new rows must state theirs.
ALTER TABLE "audit_log" ADD COLUMN "domain" text DEFAULT 'users' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "domain" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "audit_log_domain_history_idx" ON "audit_log" USING btree ("domain","occurred_at");--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_domain_check" CHECK ("audit_log"."domain" IN (
				'editorial',
				'publication',
				'scripture',
				'authorization',
				'community',
				'users'
			));--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_role_not_blank_check" CHECK ("audit_log"."actor_role" IS NULL OR btrim("audit_log"."actor_role") <> '');--> statement-breakpoint
-- The old permission codes are replaced by the catalogue in access-catalogue.ts.
-- Clearing them makes every code count as new, so db:access:sync gives each role
-- its full set of grants. Run that command straight after this migration.
DELETE FROM "role_permissions";--> statement-breakpoint
DELETE FROM "permissions";--> statement-breakpoint
CREATE FUNCTION reject_audit_log_change() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'The audit log is append-only: % is not allowed.', TG_OP;
END;
$$;--> statement-breakpoint
CREATE TRIGGER audit_log_append_only
BEFORE UPDATE OR DELETE ON "audit_log"
FOR EACH ROW
EXECUTE FUNCTION reject_audit_log_change();
