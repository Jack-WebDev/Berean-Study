import { relations, sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";

import { citations } from "./citations";

export const sources = pgTable(
	"sources",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		title: text().notNull(),

		type: text().notNull(),

		publicationYear: integer("publication_year"),
	},
	(table) => [
		check("sources_title_not_empty_check", sql`btrim(${table.title}) <> ''`),

		check("sources_type_not_empty_check", sql`btrim(${table.type}) <> ''`),
	],
);

export const sourcesRelations = relations(sources, ({ many }) => ({
	citations: many(citations),
}));
