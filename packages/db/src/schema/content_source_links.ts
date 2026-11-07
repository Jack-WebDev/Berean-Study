import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { contentRevisions } from "./content_revisions";
import { sources } from "./sources";

/**
 * A revision naming a source directly, such as "held by" on an interpretation view,
 * without citing one of its excerpts. These rows mirror the revision's body, so
 * retiring or merging a source can see what names it.
 */
export const contentSourceLinks = pgTable(
	"content_source_links",
	{
		contentRevisionId: integer("content_revision_id")
			.notNull()
			.references(() => contentRevisions.id, { onDelete: "cascade" }),

		sourceId: integer("source_id")
			.notNull()
			.references(() => sources.id, { onDelete: "restrict" }),
	},
	(table) => [
		primaryKey({ columns: [table.contentRevisionId, table.sourceId] }),

		index("content_source_links_source_id_index").on(table.sourceId),
	],
);
