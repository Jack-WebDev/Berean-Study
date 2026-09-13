ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "account_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "security_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "report_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "mention_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "reply_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "resource_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "content_update_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "commentary_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "push_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "email_notifications_enabled";
--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN IF EXISTS "security_email_notification_attempted_at";
