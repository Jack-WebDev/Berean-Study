import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { sources } from "./sources";

/**
 * One saved part of a source. Its wording lives in reviewed revisions. Which source
 * it belongs to is kept here because merging duplicates has to move it between
 * sources without inventing a new revision.
 */
export const sourceExcerpts = pgTable(
	"source_excerpts",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		sourceId: integer("source_id")
			.notNull()
			.references(() => sources.id, { onDelete: "restrict" }),

		createdByUserId: text("created_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("source_excerpts_source_id_idx").on(table.sourceId)],
);
