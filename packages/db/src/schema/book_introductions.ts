import { integer, pgTable } from "drizzle-orm/pg-core";

import { books } from "./books";

export const bookIntroductions = pgTable("book_introductions", {
	bookId: integer("book_id")
		.primaryKey()
		.references(() => books.id, {
			onDelete: "restrict",
		}),
});
