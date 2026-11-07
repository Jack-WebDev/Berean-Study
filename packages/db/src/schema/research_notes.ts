import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { books } from "./books";

/** A working note for staff. Readers never see these, so they aren't reviewed. */
export const researchNotes = pgTable(
	"research_notes",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		bookId: integer("book_id")
			.notNull()
			.references(() => books.id, { onDelete: "restrict" }),

		/** The passage as it was typed, such as "Romans 8:28". The book is resolved from it. */
		reference: text().notNull(),

		content: text("content").notNull(),

		createdByUserId: text("created_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),

		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		check(
			"research_notes_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),

		check(
			"research_notes_reference_not_empty_check",
			sql`btrim(${table.reference}) <> ''`,
		),

		index("research_notes_book_id_idx").on(table.bookId),
	],
);
