import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { notes } from "./notes";

/**
 * Earlier copies of a note's title and body, written by autosave every few
 * minutes or when a section is added. Restoring one adds a new copy rather
 * than removing any history.
 */
export const noteVersions = pgTable(
	"note_versions",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		noteId: integer("note_id")
			.notNull()
			.references(() => notes.id, { onDelete: "cascade" }),

		title: text().notNull().default(""),

		content: text().notNull(),

		/** A short description of the change, such as "Added Interpret". */
		summary: text(),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("note_versions_note_id_created_at_idx").on(
			table.noteId,
			table.createdAt.desc(),
		),
	],
);
