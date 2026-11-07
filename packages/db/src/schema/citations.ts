import { relations, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	unique,
} from "drizzle-orm/pg-core";

import type { CitationStrength } from "../evidence-body";
import { contentRevisions } from "./content_revisions";
import { sourceExcerpts } from "./source_excerpts";

/**
 * One link from a revision to the excerpt it rests on. A citation has no review of
 * its own: it's checked as part of the revision that cites it. These rows mirror
 * the revision's body, so "what cites this excerpt?" can be asked directly, and the
 * database can stop an excerpt being deleted while something cites it.
 */
export const citations = pgTable(
	"citations",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		contentRevisionId: integer("content_revision_id")
			.notNull()
			.references(() => contentRevisions.id, { onDelete: "cascade" }),

		position: integer().notNull(),

		excerptId: integer("excerpt_id")
			.notNull()
			.references(() => sourceExcerpts.id, { onDelete: "restrict" }),

		locator: text("locator"),

		strength: text().$type<CitationStrength>().notNull(),

		/**
		 * The exact versions this rested on when it was published. Later edits to the
		 * excerpt or source become new revisions and don't change what was reviewed.
		 */
		pinnedExcerptRevisionId: integer("pinned_excerpt_revision_id").references(
			() => contentRevisions.id,
			{ onDelete: "restrict" },
		),

		pinnedSourceRevisionId: integer("pinned_source_revision_id").references(
			() => contentRevisions.id,
			{ onDelete: "restrict" },
		),
	},
	(table) => [
		unique("citations_revision_position_unique").on(
			table.contentRevisionId,
			table.position,
		),

		check(
			"citations_locator_not_empty_check",
			sql`
				${table.locator} IS NULL
				OR btrim(${table.locator}) <> ''
			`,
		),

		check(
			"citations_strength_check",
			sql`${table.strength} IN ('direct', 'partial', 'background')`,
		),

		check("citations_position_positive_check", sql`${table.position} > 0`),

		index("citations_excerpt_id_index").on(table.excerptId),
	],
);

export const citationsRelations = relations(citations, ({ one }) => ({
	contentRevision: one(contentRevisions, {
		fields: [citations.contentRevisionId],
		references: [contentRevisions.id],
	}),
}));
