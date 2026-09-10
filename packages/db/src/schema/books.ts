import { relations, sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

import { bookIntroductions } from "./book_introductions";
import { chapters } from "./chapters";
import { passages } from "./passages";

export const books = pgTable(
	"books",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		name: text().notNull(),

		slug: text().notNull(),

		testament: text().$type<"old" | "new">().notNull(),
	},
	(table) => [
		unique("books_name_unique").on(table.name),

		unique("books_slug_unique").on(table.slug),

		check("books_testament_check", sql`${table.testament} IN ('old', 'new')`),

		check("books_name_not_empty_check", sql`btrim(${table.name}) <> ''`),

		check("books_slug_not_empty_check", sql`btrim(${table.slug}) <> ''`),
	],
);

export const booksRelations = relations(books, ({ many, one }) => ({
	chapters: many(chapters),
	passages: many(passages),
	introduction: one(bookIntroductions),
}));
