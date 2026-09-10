import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";
import { lexemes } from "./lexemes";
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
			columns: [table.verseId, table.position],
		}),

		index("word_occurrences_lexeme_id_idx").on(table.lexemeId),

		check("word_occurrences_position_positive", sql`${table.position} > 0`),

		check("word_occurrences_form_not_blank", sql`btrim(${table.form}) <> ''`),
	],
);
