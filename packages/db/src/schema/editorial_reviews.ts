import { sql } from "drizzle-orm";
import {
	check,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { contentRevisions } from "./content_revisions";
import { contributors } from "./contributors";

export const editorialReviews = pgTable(
	"editorial_reviews",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		contentRevisionId: integer("content_revision_id")
			.notNull()
			.references(() => contentRevisions.id, {
				onDelete: "restrict",
			}),

		reviewerUserId: text("reviewer_user_id")
			.notNull()
			.references(() => contributors.userId, {
				onDelete: "restrict",
			}),

		decision: text("decision").notNull(),

		feedback: text("feedback"),

		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
	},
	(table) => [
		unique("editorial_reviews_revision_reviewer_unique").on(
			table.contentRevisionId,
			table.reviewerUserId,
		),

		check(
			"editorial_reviews_decision_check",
			sql`${table.decision} IN ('approved', 'changes_requested')`,
		),

		check(
			"editorial_reviews_feedback_not_blank_check",
			sql`
				${table.feedback} IS NULL
				OR btrim(${table.feedback}) <> ''
			`,
		),

		check(
			"editorial_reviews_changes_requested_feedback_check",
			sql`
				${table.decision} <> 'changes_requested'
				OR ${table.feedback} IS NOT NULL
			`,
		),
	],
);
