import { relations, sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

import { commentaries } from "./commentaries";
import { contentRevisions } from "./content_revisions";
import { publishedCommentarySections } from "./published_commentary_sections";

export const commentarySections = pgTable(
	"commentary_sections",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		passageId: integer("passage_id")
			.notNull()
			.references(() => commentaries.passageId, { onDelete: "cascade" }),

		title: text("title").notNull(),

		content: text("content").notNull(),

		position: integer("position").notNull(),
	},
	(table) => [
		unique("commentary_sections_passage_position_unique").on(
			table.passageId,
			table.position,
		),

		check(
			"commentary_sections_title_not_empty_check",
			sql`btrim(${table.title}) <> ''`,
		),

		check(
			"commentary_sections_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),

		check(
			"commentary_sections_position_positive_check",
			sql`${table.position} > 0`,
		),
	],
);

export const commentarySectionsRelations = relations(
	commentarySections,
	({ one, many }) => ({
		commentary: one(commentaries, {
			fields: [commentarySections.passageId],
			references: [commentaries.passageId],
		}),
		revisions: many(contentRevisions, {
			relationName: "commentarySectionRevisions",
		}),
		published: one(publishedCommentarySections),
	}),
);
