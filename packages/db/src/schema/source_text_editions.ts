import { relations, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	unique,
} from "drizzle-orm/pg-core";

import { languages } from "./languages";
import { versificationSystems } from "./versification_systems";
import { wordOccurrences } from "./word_occurances";

/**
 * A concrete source-language text used for token, lexeme, and textual work.
 * It is distinct from a reader-facing translation.
 */
export const sourceTextEditions = pgTable(
	"source_text_editions",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		languageId: integer("language_id")
			.notNull()
			.references(() => languages.id, { onDelete: "restrict" }),

		versificationSystemId: integer("versification_system_id")
			.notNull()
			.references(() => versificationSystems.id, { onDelete: "restrict" }),

		name: text("name").notNull(),

		abbreviation: text("abbreviation").notNull(),
	},
	(table) => [
		unique("source_text_editions_name_unique").on(table.name),
		unique("source_text_editions_abbreviation_unique").on(table.abbreviation),
		index("source_text_editions_versification_system_id_idx").on(
			table.versificationSystemId,
		),
		check(
			"source_text_editions_name_not_blank",
			sql`btrim(${table.name}) <> ''`,
		),
		check(
			"source_text_editions_abbreviation_not_blank",
			sql`btrim(${table.abbreviation}) <> ''`,
		),
	],
);

export const sourceTextEditionsRelations = relations(
	sourceTextEditions,
	({ one, many }) => ({
		language: one(languages, {
			fields: [sourceTextEditions.languageId],
			references: [languages.id],
		}),
		versificationSystem: one(versificationSystems, {
			fields: [sourceTextEditions.versificationSystemId],
			references: [versificationSystems.id],
		}),
		wordOccurrences: many(wordOccurrences),
	}),
);
