import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

import { passages } from "./passages";

export const textualNotes = pgTable(
	"textual_notes",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, {
				onDelete: "restrict",
			}),

		content: text("content").notNull(),

		position: integer("position").notNull(),
	},
	(table) => [
		unique("textual_notes_passage_position_unique").on(
			table.passageId,
			table.position,
		),

		check(
			"textual_notes_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),

		check("textual_notes_position_positive_check", sql`${table.position} > 0`),
	],
);
