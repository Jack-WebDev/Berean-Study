import { sql } from "drizzle-orm";
import {
	check,
	integer,
	pgTable,
	primaryKey,
	smallint,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { books } from "./books";
import { translations } from "./translations";

/**
 * Where each member is in the Bible, so the reader opens there next time. Stored
 * as numbers rather than verse rows, because a member can be on a chapter whose
 * text hasn't been published yet.
 */
export const readingPositions = pgTable(
	"reading_positions",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		bookId: integer("book_id")
			.notNull()
			.references(() => books.id, { onDelete: "cascade" }),

		chapter: smallint().notNull(),

		verse: smallint().notNull(),

		/** Blank means the member's preferred translation. */
		translationId: integer("translation_id").references(() => translations.id, {
			onDelete: "set null",
		}),

		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({
			name: "reading_positions_pkey",
			columns: [table.userId],
		}),

		check(
			"reading_positions_place_positive_check",
			sql`${table.chapter} > 0 AND ${table.verse} > 0`,
		),
	],
);
