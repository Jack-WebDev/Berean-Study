import { relations, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";
import { lexemes } from "./lexemes";
import { sourceTextEditions } from "./source_text_editions";
import { verses } from "./verses";

/**
 * Individual source-language word occurrences in Scripture.
 *
 * Position is the token's ordered position inside the verse.
 */
export const wordOccurrences = pgTable(
	"word_occurrences",
	{
		verseId: integer("verse_id")
			.notNull()
			.references(() => verses.id, {
				onDelete: "restrict",
			}),

		sourceTextEditionId: integer("source_text_edition_id")
			.notNull()
			.references(() => sourceTextEditions.id, {
				onDelete: "restrict",
			}),

		position: integer("position").notNull(),

		/**
		 * The exact word form appearing at this location.
		 *
		 * Example:
		 * λόγος
		 */
		form: text("form").notNull(),

		/**
		 * Normally present for lexical words.
		 *
		 * Nullable because a tokenized source text can contain items
		 * for which assigning a lexeme is inappropriate or unavailable.
		 */
		lexemeId: integer("lexeme_id").references(() => lexemes.id, {
			onDelete: "restrict",
		}),
	},
	(table) => [
		primaryKey({
			columns: [table.sourceTextEditionId, table.verseId, table.position],
		}),

		index("word_occurrences_verse_id_idx").on(table.verseId),

		index("word_occurrences_lexeme_id_idx").on(table.lexemeId),

		check("word_occurrences_position_positive", sql`${table.position} > 0`),

		check("word_occurrences_form_not_blank", sql`btrim(${table.form}) <> ''`),
	],
);

export const wordOccurrencesRelations = relations(
	wordOccurrences,
	({ one }) => ({
		verse: one(verses, {
			fields: [wordOccurrences.verseId],
			references: [verses.id],
		}),
		sourceTextEdition: one(sourceTextEditions, {
			fields: [wordOccurrences.sourceTextEditionId],
			references: [sourceTextEditions.id],
		}),
		lexeme: one(lexemes, {
			fields: [wordOccurrences.lexemeId],
			references: [lexemes.id],
		}),
	}),
);
