import { relations } from "drizzle-orm";
import { foreignKey, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { commentarySections } from "./commentary_sections";
import { contentRevisions } from "./content_revisions";

/** The currently published revision for a commentary section. */
export const publishedCommentarySections = pgTable(
	"published_commentary_sections",
	{
		commentarySectionId: integer("commentary_section_id")
			.notNull()
			.references(() => commentarySections.id, { onDelete: "restrict" }),

		contentRevisionId: integer("content_revision_id").notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.commentarySectionId] }),
		foreignKey({
			columns: [table.contentRevisionId, table.commentarySectionId],
			foreignColumns: [
				contentRevisions.id,
				contentRevisions.commentarySectionId,
			],
			name: "published_commentary_sections_revision_target_fk",
		}).onDelete("restrict"),
	],
);

export const publishedCommentarySectionsRelations = relations(
	publishedCommentarySections,
	({ one }) => ({
		section: one(commentarySections, {
			fields: [publishedCommentarySections.commentarySectionId],
			references: [commentarySections.id],
		}),
		revision: one(contentRevisions, {
			fields: [publishedCommentarySections.contentRevisionId],
			references: [contentRevisions.id],
		}),
	}),
);
