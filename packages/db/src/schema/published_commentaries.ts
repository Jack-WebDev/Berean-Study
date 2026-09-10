import { relations } from "drizzle-orm";
import { foreignKey, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { commentaries } from "./commentaries";
import { contentRevisions } from "./content_revisions";

/** The currently published revision for a passage commentary. */
export const publishedCommentaries = pgTable(
	"published_commentaries",
	{
		passageId: integer("passage_id")
			.notNull()
			.references(() => commentaries.passageId, { onDelete: "restrict" }),

		contentRevisionId: integer("content_revision_id").notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.passageId] }),
		foreignKey({
			columns: [table.contentRevisionId, table.passageId],
			foreignColumns: [
				contentRevisions.id,
				contentRevisions.commentaryPassageId,
			],
			name: "published_commentaries_revision_target_fk",
		}).onDelete("restrict"),
	],
);

export const publishedCommentariesRelations = relations(
	publishedCommentaries,
	({ one }) => ({
		commentary: one(commentaries, {
			fields: [publishedCommentaries.passageId],
			references: [commentaries.passageId],
		}),
		revision: one(contentRevisions, {
			fields: [publishedCommentaries.contentRevisionId],
			references: [contentRevisions.id],
		}),
	}),
);
