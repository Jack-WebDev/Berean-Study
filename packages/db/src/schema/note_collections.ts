import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const userNoteCollections = pgTable(
	"user_note_collections",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		name: text().notNull(),
		normalizedName: text("normalized_name").notNull(),
	},
	(table) => [
		unique("user_note_collections_user_id_normalized_name_unique").on(
			table.userId,
			table.normalizedName,
		),
		check(
			"user_note_collections_name_not_empty_check",
			sql`btrim(${table.name}) <> ''`,
		),
		check(
			"user_note_collections_normalized_name_not_empty_check",
			sql`btrim(${table.normalizedName}) <> ''`,
		),
	],
);
