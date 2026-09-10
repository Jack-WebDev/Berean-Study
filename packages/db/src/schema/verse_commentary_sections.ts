import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

import { verseCommentaries } from "./verse_commentaries";

export const verseCommentarySections = pgTable(
	"verse_commentary_sections",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		passageId: integer("passage_id")
			.notNull()
			.references(() => verseCommentaries.passageId, {
				onDelete: "cascade",
			}),

		title: text().notNull(),

		content: text().notNull(),

		position: integer().notNull(),
	},
	(table) => [
		unique("verse_commentary_sections_passage_position_unique").on(
			table.passageId,
			table.position,
		),

		check(
			"verse_commentary_sections_title_not_empty_check",
			sql`btrim(${table.title}) <> ''`,
		),

		check(
			"verse_commentary_sections_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),

		check(
			"verse_commentary_sections_position_positive_check",
			sql`${table.position} > 0`,
		),
	],
);
