import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	unique,
} from "drizzle-orm/pg-core";

import { books } from "./books";
import { contentRevisions } from "./content_revisions";

/**
 * Which verses one revision is about. These rows mirror the revision's body, so
 * "what's attached to this verse?" can be asked directly instead of reading every
 * revision. Verses are entered over time, so these name numbers, not verse rows.
 */
export const contentPassages = pgTable(
	"content_passages",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		contentRevisionId: integer("content_revision_id")
			.notNull()
			.references(() => contentRevisions.id, { onDelete: "cascade" }),

		position: integer().notNull(),

		bookId: integer("book_id")
			.notNull()
			.references(() => books.id, { onDelete: "restrict" }),

		fromChapter: integer("from_chapter").notNull(),
		fromVerse: integer("from_verse").notNull(),
		toChapter: integer("to_chapter").notNull(),
		toVerse: integer("to_verse").notNull(),

		/** A one-way cross-reference is listed for staff on its target, but not for readers. */
		showsToReaders: boolean("shows_to_readers").notNull().default(true),
	},
	(table) => [
		unique("content_passages_revision_position_unique").on(
			table.contentRevisionId,
			table.position,
		),

		check(
			"content_passages_range_check",
			sql`
				${table.fromChapter} > 0
				AND ${table.fromVerse} > 0
				AND (${table.fromChapter}, ${table.fromVerse}) <= (${table.toChapter}, ${table.toVerse})
			`,
		),

		index("content_passages_book_chapters_index").on(
			table.bookId,
			table.fromChapter,
			table.toChapter,
		),
	],
);
