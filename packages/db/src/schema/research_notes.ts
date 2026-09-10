import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text } from "drizzle-orm/pg-core";

import { books } from "./books";
import { passages } from "./passages";

export const researchNotes = pgTable(
	"research_notes",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		bookId: integer("book_id").references(() => books.id, {
			onDelete: "restrict",
		}),

		passageId: integer("passage_id").references(() => passages.id, {
			onDelete: "restrict",
		}),

		content: text("content").notNull(),
	},
	(table) => [
		check(
			"research_notes_target_check",
			sql`num_nonnulls(${table.bookId}, ${table.passageId}) = 1`,
		),

		check(
			"research_notes_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),

		index("research_notes_book_id_idx")
			.on(table.bookId)
			.where(sql`${table.bookId} IS NOT NULL`),

		index("research_notes_passage_id_idx")
			.on(table.passageId)
			.where(sql`${table.passageId} IS NOT NULL`),
	],
);
