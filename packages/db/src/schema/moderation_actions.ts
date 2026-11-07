import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { communityPosts } from "./community_posts";

/**
 * Every decision a moderator makes about a Community post, in order. Rows are
 * added, never changed, so a post's history can always be read back.
 */
export const moderationActions = pgTable(
	"moderation_actions",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		communityPostId: integer("community_post_id")
			.notNull()
			.references(() => communityPosts.id, { onDelete: "restrict" }),

		moderatorUserId: text("moderator_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		action: text().notNull(),

		/** The community rule the author is told about. Empty when no rule was broken. */
		ruleKey: text("rule_key"),

		/** For the record. The author never sees it. */
		note: text(),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		check(
			"moderation_actions_action_check",
			sql`${table.action} IN (
				'removed',
				'removed_and_warned',
				'restricted',
				'dismissed',
				'restored'
			)`,
		),

		check(
			"moderation_actions_rule_check",
			sql`
				${table.action} IN ('dismissed', 'restored')
				OR ${table.ruleKey} IS NOT NULL
			`,
		),

		check(
			"moderation_actions_note_not_blank_check",
			sql`${table.note} IS NULL OR btrim(${table.note}) <> ''`,
		),

		index("moderation_actions_post_idx").on(
			table.communityPostId,
			table.createdAt,
		),
	],
);
