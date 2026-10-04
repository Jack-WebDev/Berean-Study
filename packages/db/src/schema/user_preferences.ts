import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { canonTraditions } from "./canon_traditions";
import { translations } from "./translations";

export const userPreferences = pgTable("user_preferences", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),

	preferredCanonTraditionId: integer("preferred_canon_tradition_id").references(
		() => canonTraditions.id,
		{ onDelete: "set null" },
	),

	preferredTranslationId: integer("preferred_translation_id").references(
		() => translations.id,
		{ onDelete: "set null" },
	),

	emailNotificationsEnabled: boolean("email_notifications_enabled")
		.default(false)
		.notNull(),
	pushNotificationsEnabled: boolean("push_notifications_enabled")
		.default(false)
		.notNull(),
	commentaryNotificationsEnabled: boolean("commentary_notifications_enabled")
		.default(false)
		.notNull(),
	contentUpdateNotificationsEnabled: boolean(
		"content_update_notifications_enabled",
	)
		.default(false)
		.notNull(),
	resourceNotificationsEnabled: boolean("resource_notifications_enabled")
		.default(false)
		.notNull(),
	replyNotificationsEnabled: boolean("reply_notifications_enabled")
		.default(false)
		.notNull(),
	mentionNotificationsEnabled: boolean("mention_notifications_enabled")
		.default(false)
		.notNull(),
	reportNotificationsEnabled: boolean("report_notifications_enabled")
		.default(false)
		.notNull(),
	securityNotificationsEnabled: boolean("security_notifications_enabled")
		.default(false)
		.notNull(),
	accountNotificationsEnabled: boolean("account_notifications_enabled")
		.default(false)
		.notNull(),
	emailCommentaryNotificationsEnabled: boolean(
		"email_commentary_notifications_enabled",
	)
		.default(false)
		.notNull(),
	emailContentUpdateNotificationsEnabled: boolean(
		"email_content_update_notifications_enabled",
	)
		.default(false)
		.notNull(),
	emailResourceNotificationsEnabled: boolean(
		"email_resource_notifications_enabled",
	)
		.default(false)
		.notNull(),
	emailReplyNotificationsEnabled: boolean("email_reply_notifications_enabled")
		.default(false)
		.notNull(),
	emailMentionNotificationsEnabled: boolean(
		"email_mention_notifications_enabled",
	)
		.default(false)
		.notNull(),
	emailReportNotificationsEnabled: boolean("email_report_notifications_enabled")
		.default(false)
		.notNull(),
	emailSecurityNotificationsEnabled: boolean(
		"email_security_notifications_enabled",
	)
		.default(false)
		.notNull(),
	emailAccountNotificationsEnabled: boolean(
		"email_account_notifications_enabled",
	)
		.default(false)
		.notNull(),
});
