import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

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
