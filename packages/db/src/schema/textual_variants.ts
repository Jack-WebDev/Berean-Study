import { sql } from "drizzle-orm";
import {
	check,
	integer,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { textualNotes } from "./textual_notes";

/**
 * A competing textual reading belonging to one textual-critical issue.
 *
 * Example for John 1:18:
 *
 * textual_note
 * ├── μονογενὴς θεός
 * └── ὁ μονογενὴς υἱός
 */
export const textualVariants = pgTable(
	"textual_variants",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		textualNoteId: integer("textual_note_id")
			.notNull()
			.references(() => textualNotes.id, {
				onDelete: "cascade",
			}),

		/**
		 * The actual competing reading.
		 *
		 * Store the source-language reading rather than an English
		 * description of it.
		 */
		reading: text("reading").notNull(),

		/**
		 * Editorial ordering of readings within the textual issue.
		 */
		position: integer("position").notNull(),
	},
	(table) => [
		uniqueIndex("textual_variants_note_position_unique").on(
			table.textualNoteId,
			table.position,
		),

		check(
			"textual_variants_reading_not_blank",
			sql`btrim(${table.reading}) <> ''`,
		),

		check("textual_variants_position_positive", sql`${table.position} > 0`),
	],
);
