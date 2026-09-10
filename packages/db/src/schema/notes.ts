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
import { passages } from "./passages";

export const notes = pgTable(
	"notes",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, { onDelete: "restrict" }),

		content: text().notNull(),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),

		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("notes_user_id_passage_id_idx").on(table.userId, table.passageId),

		check("notes_content_not_empty_check", sql`btrim(${table.content}) <> ''`),
	],
);
