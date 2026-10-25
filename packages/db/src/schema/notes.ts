import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const notes = pgTable(
	"notes",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		title: text().notNull().default(""),

		/** Autosave keeps a note in draft until the member saves it. */
		status: text().$type<"draft" | "saved">().notNull().default("draft"),

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
		index("notes_user_id_idx").on(table.userId),
		unique("notes_id_user_id_unique").on(table.id, table.userId),

		check("notes_content_not_empty_check", sql`btrim(${table.content}) <> ''`),
		check("notes_status_check", sql`${table.status} IN ('draft', 'saved')`),
		check(
			"notes_saved_title_check",
			sql`${table.status} = 'draft' OR btrim(${table.title}) <> ''`,
		),
	],
);
