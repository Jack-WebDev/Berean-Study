import { relations, sql } from "drizzle-orm";
import { check, index, integer, pgTable, text } from "drizzle-orm/pg-core";

import { contentRevisions } from "./content_revisions";
import { sources } from "./sources";

export const citations = pgTable(
	"citations",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		sourceId: integer("source_id")
			.notNull()
			.references(() => sources.id, {
				onDelete: "restrict",
			}),

		locator: text("locator"),

		contentRevisionId: integer("content_revision_id")
			.notNull()
			.references(() => contentRevisions.id, { onDelete: "restrict" }),
	},
	(table) => [
		check(
			"citations_locator_not_empty_check",
			sql`
				${table.locator} IS NULL
				OR btrim(${table.locator}) <> ''
			`,
		),

		index("citations_source_id_index").on(table.sourceId),

		index("citations_content_revision_id_index").on(table.contentRevisionId),
	],
);

export const citationsRelations = relations(citations, ({ one }) => ({
	source: one(sources, {
		fields: [citations.sourceId],
		references: [sources.id],
	}),
	contentRevision: one(contentRevisions, {
		fields: [citations.contentRevisionId],
		references: [contentRevisions.id],
	}),
}));
