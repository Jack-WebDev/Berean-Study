import { sql } from "drizzle-orm";
import {
	check,
	integer,
	pgTable,
	primaryKey,
	smallint,
	unique,
} from "drizzle-orm/pg-core";

import { books } from "./books";
import { canonTraditions } from "./canon_traditions";

export const canonBooks = pgTable(
	"canon_books",
	{
		canonId: integer("canon_id")
			.notNull()
			.references(() => canonTraditions.id),

		bookId: integer("book_id")
			.notNull()
			.references(() => books.id),

		canonicalOrder: smallint("canonical_order").notNull(),
	},
	(table) => [
		primaryKey({
			name: "canon_books_pkey",
			columns: [table.canonId, table.bookId],
		}),

		unique("canon_books_order_unique").on(table.canonId, table.canonicalOrder),

		check("canon_books_order_positive_check", sql`${table.canonicalOrder} > 0`),
	],
);
