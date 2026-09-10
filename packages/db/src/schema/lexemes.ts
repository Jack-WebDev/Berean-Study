import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { languages } from "./languages";
/**
 * Dictionary-form words from the biblical source languages.
 *
 * A lexeme represents the lexical identity, not a specific occurrence
 * of the word in Scripture.
 */
export const lexemes = pgTable(
	"lexemes",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		languageId: integer("language_id")
			.notNull()
			.references(() => languages.id, {
				onDelete: "restrict",
			}),

		lemma: text("lemma").notNull(),
	},
	(table) => [
		index("lexemes_language_id_idx").on(table.languageId),

		check("lexemes_lemma_not_blank", sql`btrim(${table.lemma}) <> ''`),
	],
);
