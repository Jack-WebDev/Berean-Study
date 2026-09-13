import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { notes } from "./notes";

export const userNoteTags = pgTable(
	"user_note_tags",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		name: text().notNull(),
		normalizedName: text("normalized_name").notNull(),
	},
	(table) => [
		unique("user_note_tags_user_id_normalized_name_unique").on(
			table.userId,
			table.normalizedName,
		),
		check(
			"user_note_tags_name_not_empty_check",
			sql`btrim(${table.name}) <> ''`,
		),
		check(
			"user_note_tags_normalized_name_not_empty_check",
			sql`btrim(${table.normalizedName}) <> ''`,
		),
	],
);

export const noteTagAssignments = pgTable(
	"note_tag_assignments",
	{
		noteId: integer("note_id")
			.notNull()
			.references(() => notes.id, { onDelete: "cascade" }),

		tagId: integer("tag_id")
			.notNull()
			.references(() => userNoteTags.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.noteId, table.tagId] }),
		index("note_tag_assignments_tag_id_note_id_idx").on(
			table.tagId,
			table.noteId,
		),
	],
);
