ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "email_account_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "email_security_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "email_report_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "email_mention_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "email_reply_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "email_resource_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "email_content_update_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "email_commentary_notifications_enabled";
