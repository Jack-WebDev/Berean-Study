import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { collections } from "./collections";
import { notes } from "./notes";

/** Links existing notes to a collection without giving either ownership of the other. */
export const collectionNotes = pgTable(
	"collection_notes",
	{
		collectionId: integer("collection_id")
			.notNull()
			.references(() => collections.id, { onDelete: "cascade" }),
		noteId: integer("note_id")
			.notNull()
			.references(() => notes.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.collectionId, table.noteId] }),
		index("collection_notes_note_id_idx").on(table.noteId),
	],
);
