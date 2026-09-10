import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { contentIssues } from "./content_issues";
import { contributors } from "./contributors";

export const contentIssueComments = pgTable(
	"content_issue_comments",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		contentIssueId: integer("content_issue_id")
			.notNull()
			.references(() => contentIssues.id, {
				onDelete: "cascade",
			}),

		authorUserId: text("author_user_id")
			.notNull()
			.references(() => contributors.userId, {
				onDelete: "restrict",
			}),

		content: text("content").notNull(),

		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
	},
	(table) => [
		check(
			"content_issue_comments_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),

		index("content_issue_comments_issue_created_at_idx").on(
			table.contentIssueId,
			table.createdAt,
		),
	],
);
