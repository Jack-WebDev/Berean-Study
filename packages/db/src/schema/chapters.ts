import { relations, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	smallint,
	unique,
} from "drizzle-orm/pg-core";

import { books } from "./books";
import { verses } from "./verses";
import { versificationSystems } from "./versification_systems";

export const chapters = pgTable(
	"chapters",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		bookId: integer("book_id")
			.notNull()
			.references(() => books.id),

		versificationSystemId: integer("versification_system_id")
			.notNull()
			.references(() => versificationSystems.id),

		number: smallint().notNull(),
	},
	(table) => [
		unique("chapters_versification_book_number_unique").on(
			table.versificationSystemId,
			table.bookId,
			table.number,
		),

		index("chapters_book_versification_idx").on(
			table.bookId,
			table.versificationSystemId,
		),

		check("chapters_number_positive_check", sql`${table.number} > 0`),
	],
);

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
	book: one(books, {
		fields: [chapters.bookId],
		references: [books.id],
	}),
	verses: many(verses),
}));
