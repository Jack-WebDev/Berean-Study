import { relations, sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";

import { commentarySections } from "./commentary_sections";
import { contentRevisions } from "./content_revisions";
import { passages } from "./passages";
import { publishedCommentaries } from "./published_commentaries";

/**
 * The current working commentary for one conceptual passage.
 *
 * A verse commentary is commentary attached to a passage whose range is one
 * verse. Keeping one table avoids storing the same commentary twice under two
 * labels that the database cannot distinguish.
 */
export const commentaries = pgTable(
	"commentaries",
	{
		passageId: integer("passage_id")
			.primaryKey()
			.references(() => passages.id, { onDelete: "restrict" }),

		content: text("content").notNull(),
	},
	(table) => [
		check(
			"commentaries_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),
	],
);

export const commentariesRelations = relations(
	commentaries,
	({ one, many }) => ({
		passage: one(passages, {
			fields: [commentaries.passageId],
			references: [passages.id],
		}),
		sections: many(commentarySections),
		revisions: many(contentRevisions, {
			relationName: "commentaryRevisions",
		}),
		published: one(publishedCommentaries),
	}),
);
