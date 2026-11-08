import { relations, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	smallint,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { books } from "./books";
import { passages } from "./passages";

/**
 * What each member has read, newest first. A visit is either to a stored passage
 * (from older pages) or to a whole chapter in the Bible reader.
 */
export const readingHistory = pgTable(
	"reading_history",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		passageId: integer("passage_id").references(() => passages.id, {
			onDelete: "cascade",
		}),

		bookId: integer("book_id").references(() => books.id, {
			onDelete: "cascade",
		}),

		chapter: smallint(),

		visitedAt: timestamp("visited_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("reading_history_user_visited_at_idx").on(
			table.userId,
			table.visitedAt.desc(),
		),

		check(
			"reading_history_visit_check",
			sql`(${table.passageId} IS NOT NULL) <> (${table.bookId} IS NOT NULL)
				AND (${table.bookId} IS NULL) = (${table.chapter} IS NULL)`,
		),
	],
);

export const readingHistoryRelations = relations(readingHistory, ({ one }) => ({
	user: one(user, {
		fields: [readingHistory.userId],
		references: [user.id],
	}),

	passage: one(passages, {
		fields: [readingHistory.passageId],
		references: [passages.id],
	}),
}));
