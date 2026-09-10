import { relations, sql } from "drizzle-orm";
import { check, integer, pgTable, unique } from "drizzle-orm/pg-core";

import { chapters } from "./chapters";
import { verseTexts } from "./verse_texts";
import { wordOccurrences } from "./word_occurances";

export const verses = pgTable(
	"verses",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		chapterId: integer("chapter_id")
			.notNull()
			.references(() => chapters.id, {
				onDelete: "restrict",
			}),

		number: integer().notNull(),
	},
	(table) => [
		unique("verses_chapter_id_number_unique").on(table.chapterId, table.number),

		check("verses_number_positive_check", sql`${table.number} > 0`),
	],
);

export const versesRelations = relations(verses, ({ one, many }) => ({
	chapter: one(chapters, {
		fields: [verses.chapterId],
		references: [chapters.id],
	}),
	texts: many(verseTexts),
	wordOccurrences: many(wordOccurrences),
}));
