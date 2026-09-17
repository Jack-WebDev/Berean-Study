import {
	foreignKey,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";

import { notes } from "./notes";
import { testimonies } from "./testimonies";

export const testimonyNotes = pgTable(
	"testimony_notes",
	{
		testimonyId: integer("testimony_id").notNull(),

		noteId: integer("note_id").notNull(),

		userId: text("user_id").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.testimonyId, table.noteId],
		}),

		foreignKey({
			columns: [table.testimonyId, table.userId],
			foreignColumns: [testimonies.id, testimonies.userId],
			name: "testimony_notes_testimony_owner_fk",
		}).onDelete("cascade"),

		foreignKey({
			columns: [table.noteId, table.userId],
			foreignColumns: [notes.id, notes.userId],
			name: "testimony_notes_note_owner_fk",
		}).onDelete("cascade"),

		index("testimony_notes_note_id_idx").on(table.noteId),
	],
);
