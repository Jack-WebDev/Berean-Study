import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

import { passages } from "./passages";

export const originalLanguageNotes = pgTable(
	"original_language_notes",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, {
				onDelete: "restrict",
			}),

		content: text().notNull(),

		position: integer().notNull(),
	},
	(table) => [
		unique("original_language_notes_passage_position_unique").on(
			table.passageId,
			table.position,
		),

		check(
			"original_language_notes_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),

		check(
			"original_language_notes_position_positive_check",
			sql`${table.position} > 0`,
		),
	],
);
