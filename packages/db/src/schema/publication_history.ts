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

export const publicationHistory = pgTable(
	"publication_history",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		contentRevisionId: integer("content_revision_id")
			.notNull()
			.references(() => contentRevisions.id, {
				onDelete: "restrict",
			}),

		action: text().notNull(),

		performedByUserId: text("performed_by_user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "restrict",
			}),

		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
	},
	(table) => [
		check(
			"publication_history_action_check",
			sql`${table.action} IN ('published', 'corrected', 'republished', 'withdrawn')`,
		),

		index("publication_history_revision_created_at_idx").on(
			table.contentRevisionId,
			table.createdAt,
		),
	],
);
