import { sql } from "drizzle-orm";
import {
	check,
	integer,
	pgTable,
	primaryKey,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { books } from "./books";

export const bookAliases = pgTable(
	"book_aliases",
	{
		bookId: integer("book_id")
			.notNull()
			.references(() => books.id, {
				onDelete: "cascade",
			}),

		alias: text("alias").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.bookId, table.alias],
			name: "book_aliases_pk",
		}),

		uniqueIndex("book_aliases_alias_lower_unique").on(
			sql`lower(${table.alias})`,
		),

		check(
			"book_aliases_alias_not_blank_check",
			sql`${table.alias} = btrim(${table.alias}) AND ${table.alias} <> ''`,
		),
	],
);
