import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text } from "drizzle-orm/pg-core";

import { books } from "./books";

export const passages = pgTable(
	"passages",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		bookId: integer("book_id")
			.notNull()
			.references(() => books.id, {
				onDelete: "restrict",
			}),

		title: text(),
	},
	(table) => [
		check(
			"passages_title_not_empty_check",
			sql`${table.title} IS NULL OR btrim(${table.title}) <> ''`,
		),

		index("passages_book_id_idx").on(table.bookId),
	],
);
