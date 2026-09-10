import { integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { passages } from "./passages";

export const readingPositions = pgTable(
	"reading_positions",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({
			name: "reading_positions_pkey",
			columns: [table.userId],
		}),
	],
);
