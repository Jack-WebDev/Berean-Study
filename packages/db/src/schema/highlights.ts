import { sql } from "drizzle-orm";
import {
	check,
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { verseTexts } from "./verse_texts";

export const highlights = pgTable(
	"highlights",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		translationId: integer("translation_id").notNull(),

		verseId: integer("verse_id").notNull(),

		startOffset: integer("start_offset").notNull(),

		endOffset: integer("end_offset").notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.translationId, table.verseId],
			foreignColumns: [verseTexts.translationId, verseTexts.verseId],
			name: "highlights_verse_text_fk",
		}).onDelete("cascade"),

		unique("highlights_exact_range_unique").on(
			table.userId,
			table.translationId,
			table.verseId,
			table.startOffset,
			table.endOffset,
		),

		index("highlights_translation_verse_idx").on(
			table.translationId,
			table.verseId,
		),

		check("highlights_start_offset_check", sql`${table.startOffset} >= 0`),

		check(
			"highlights_end_offset_check",
			sql`${table.endOffset} > ${table.startOffset}`,
		),
	],
);
