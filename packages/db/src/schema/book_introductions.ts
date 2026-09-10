import { relations } from "drizzle-orm";
import { integer, pgTable } from "drizzle-orm/pg-core";

import { bookIntroductionSections } from "./book_introduction_sections";
import { books } from "./books";

export const bookIntroductions = pgTable("book_introductions", {
	bookId: integer("book_id")
		.primaryKey()
		.references(() => books.id, {
			onDelete: "restrict",
		}),
});

export const bookIntroductionsRelations = relations(
	bookIntroductions,
	({ one, many }) => ({
		book: one(books, {
			fields: [bookIntroductions.bookId],
			references: [books.id],
		}),
		sections: many(bookIntroductionSections),
	}),
);
