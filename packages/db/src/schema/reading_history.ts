import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { passages } from "./passages";

export const readingHistory = pgTable(
	"reading_history",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, { onDelete: "cascade" }),

		visitedAt: timestamp("visited_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("reading_history_user_visited_at_idx").on(
			table.userId,
			table.visitedAt.desc(),
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
