import { relations, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";

import { translations } from "./translations";
import { verses } from "./verses";

export const verseTexts = pgTable(
	"verse_texts",
	{
		translationId: integer("translation_id")
			.notNull()
			.references(() => translations.id, {
				onDelete: "restrict",
			}),

		verseId: integer("verse_id")
			.notNull()
			.references(() => verses.id, {
				onDelete: "restrict",
			}),

		text: text().notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.translationId, table.verseId],
		}),

		check("verse_texts_text_not_empty_check", sql`btrim(${table.text}) <> ''`),

		index("verse_texts_verse_id_idx").on(table.verseId),
	],
);

export const verseTextsRelations = relations(verseTexts, ({ one }) => ({
	translation: one(translations, {
		fields: [verseTexts.translationId],
		references: [translations.id],
	}),
	verse: one(verses, {
		fields: [verseTexts.verseId],
		references: [verses.id],
	}),
}));
