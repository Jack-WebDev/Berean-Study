import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
} from "drizzle-orm/pg-core";

import { notes } from "./notes";
import { passages } from "./passages";

/** The Scripture passages a note is studied alongside, in the member's order. */
export const notePassages = pgTable(
	"note_passages",
	{
		noteId: integer("note_id")
			.notNull()
			.references(() => notes.id, { onDelete: "cascade" }),
		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, { onDelete: "restrict" }),
		position: integer().notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.noteId, table.passageId] }),
		index("note_passages_passage_id_idx").on(table.passageId),
		check("note_passages_position_check", sql`${table.position} >= 0`),
	],
);
