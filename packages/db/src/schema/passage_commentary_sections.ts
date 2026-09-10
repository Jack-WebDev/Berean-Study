import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

import { passageCommentaries } from "./passage_commentaries";

export const passageCommentarySections = pgTable(
	"passage_commentary_sections",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		passageId: integer("passage_id")
			.notNull()
			.references(() => passageCommentaries.passageId, {
				onDelete: "cascade",
			}),

		title: text().notNull(),

		content: text().notNull(),

		position: integer().notNull(),
	},
	(table) => [
		unique("passage_commentary_sections_passage_position_unique").on(
			table.passageId,
			table.position,
		),

		check(
			"passage_commentary_sections_title_not_empty_check",
			sql`btrim(${table.title}) <> ''`,
		),

		check(
			"passage_commentary_sections_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),

		check(
			"passage_commentary_sections_position_positive_check",
			sql`${table.position} > 0`,
		),
	],
);
