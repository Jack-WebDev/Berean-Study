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
import { contentRevisions } from "./content_revisions";
import { contributors } from "./contributors";

export const contentIssues = pgTable(
	"content_issues",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		contentRevisionId: integer("content_revision_id")
			.notNull()
			.references(() => contentRevisions.id, {
				onDelete: "restrict",
			}),

		reportedByUserId: text("reported_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),

		issueType: text("issue_type").notNull(),

		description: text("description").notNull(),

		status: text("status").notNull().default("open"),

		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),

		closedByUserId: text("closed_by_user_id").references(
			() => contributors.userId,
			{
				onDelete: "restrict",
			},
		),

		closedAt: timestamp("closed_at", {
			withTimezone: true,
		}),
	},
	(table) => [
		check(
			"content_issues_issue_type_check",
			sql`${table.issueType} IN (
				'factual_error',
				'citation_problem',
				'typo',
				'interpretation_concern',
				'broken_reference',
				'other'
			)`,
		),

		check(
			"content_issues_description_not_empty_check",
			sql`btrim(${table.description}) <> ''`,
		),

		check(
			"content_issues_status_check",
			sql`${table.status} IN (
				'open',
				'resolved',
				'dismissed'
			)`,
		),

		check(
			"content_issues_closed_state_check",
			sql`
				(
					${table.status} = 'open'
					AND ${table.closedByUserId} IS NULL
					AND ${table.closedAt} IS NULL
				)
				OR
				(
					${table.status} IN ('resolved', 'dismissed')
					AND ${table.closedByUserId} IS NOT NULL
					AND ${table.closedAt} IS NOT NULL
				)
			`,
		),

		index("content_issues_revision_status_idx").on(
			table.contentRevisionId,
			table.status,
		),

		index("content_issues_open_created_at_idx")
			.on(table.createdAt)
			.where(sql`${table.status} = 'open'`),
	],
);
