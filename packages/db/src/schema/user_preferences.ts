import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import type {
	BrowseTestament,
	LineLength,
	PageColour,
	ReadingTextSize,
	VerseLayout,
} from "../reader-catalogue";
import { user } from "./auth";
import { canonTraditions } from "./canon_traditions";
import { translations } from "./translations";

export const userPreferences = pgTable(
	"user_preferences",
	{
		userId: text("user_id")
			.primaryKey()
			.references(() => user.id, { onDelete: "cascade" }),

		preferredCanonTraditionId: integer(
			"preferred_canon_tradition_id",
		).references(() => canonTraditions.id, { onDelete: "set null" }),

		preferredTranslationId: integer("preferred_translation_id").references(
			() => translations.id,
			{ onDelete: "set null" },
		),

		/**
		 * The member asked to be reminded to reflect on their prayers each month.
		 * TODO: nothing sends this reminder yet; only the choice is saved.
		 */
		reflectionRemindersEnabled: boolean("reflection_reminders_enabled")
			.default(false)
			.notNull(),

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
		emailReportNotificationsEnabled: boolean(
			"email_report_notifications_enabled",
		)
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

		/* How the Bible reader looks. The defaults are what a new reader sees. */
		readingTextSize: text("reading_text_size")
			.$type<ReadingTextSize>()
			.default("large")
			.notNull(),
		verseLayout: text("verse_layout")
			.$type<VerseLayout>()
			.default("verse")
			.notNull(),
		showVerseNumbers: boolean("show_verse_numbers").default(true).notNull(),
		/** The whole app's colours. "system" follows the device's light or dark setting. */
		pageColour: text("page_colour")
			.$type<PageColour>()
			.default("light")
			.notNull(),
		/** How wide the text column is on tablets and computers. */
		lineLength: text("line_length")
			.$type<LineLength>()
			.default("default")
			.notNull(),
		/** Berean Study's own headings above verses. Only offered once approved. */
		showSectionHeadings: boolean("show_section_headings")
			.default(false)
			.notNull(),
		/** Set once the first-time welcome is finished or skipped, so it shows only once. */
		welcomeCompletedAt: timestamp("welcome_completed_at", {
			withTimezone: true,
		}),
		/** Set once the "Tap any verse" hint is dismissed, so it shows only once. */
		readerHintSeenAt: timestamp("reader_hint_seen_at", { withTimezone: true }),
		/** The testament tab last chosen on Browse, so it opens there next time. */
		browseTestament: text("browse_testament")
			.$type<BrowseTestament>()
			.default("old")
			.notNull(),
	},
	(table) => [
		check(
			"user_preferences_reading_text_size_check",
			sql`${table.readingTextSize} IN ('standard', 'large', 'larger', 'largest')`,
		),
		check(
			"user_preferences_verse_layout_check",
			sql`${table.verseLayout} IN ('verse', 'paragraph')`,
		),
		check(
			"user_preferences_page_colour_check",
			sql`${table.pageColour} IN ('light', 'dark', 'system')`,
		),
		check(
			"user_preferences_line_length_check",
			sql`${table.lineLength} IN ('narrow', 'default', 'wide')`,
		),
		check(
			"user_preferences_browse_testament_check",
			sql`${table.browseTestament} IN ('old', 'new')`,
		),
	],
);
