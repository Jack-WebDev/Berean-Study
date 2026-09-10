import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";

import { researchNotes } from "./research_notes";
import { sources } from "./sources";

export const researchNoteSources = pgTable(
	"research_note_sources",
	{
		researchNoteId: integer("research_note_id")
			.notNull()
			.references(() => researchNotes.id, {
				onDelete: "cascade",
			}),

		sourceId: integer("source_id")
			.notNull()
			.references(() => sources.id, {
				onDelete: "restrict",
			}),

		locator: text("locator"),
	},
	(table) => [
		primaryKey({
			name: "research_note_sources_pkey",
			columns: [table.researchNoteId, table.sourceId],
		}),

		index("research_note_sources_source_id_idx").on(table.sourceId),

		check(
			"research_note_sources_locator_not_empty_check",
			sql`${table.locator} IS NULL OR btrim(${table.locator}) <> ''`,
		),
	],
);
