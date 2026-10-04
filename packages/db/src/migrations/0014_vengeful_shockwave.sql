ALTER TABLE "user_preferences" ADD COLUMN "email_commentary_notifications_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "email_content_update_notifications_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "email_resource_notifications_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "email_reply_notifications_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "email_mention_notifications_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "email_report_notifications_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "email_security_notifications_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "email_account_notifications_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "user_preferences"
SET
	"email_commentary_notifications_enabled" = "commentary_notifications_enabled",
	"email_content_update_notifications_enabled" = "content_update_notifications_enabled",
	"email_resource_notifications_enabled" = "resource_notifications_enabled",
	"email_reply_notifications_enabled" = "reply_notifications_enabled",
	"email_mention_notifications_enabled" = "mention_notifications_enabled",
	"email_report_notifications_enabled" = "report_notifications_enabled",
	"email_security_notifications_enabled" = "security_notifications_enabled",
	"email_account_notifications_enabled" = "account_notifications_enabled"
WHERE "email_notifications_enabled" = true;
