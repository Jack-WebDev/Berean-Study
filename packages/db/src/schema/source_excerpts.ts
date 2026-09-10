import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text } from "drizzle-orm/pg-core";

import { sources } from "./sources";

export const sourceExcerpts = pgTable(
	"source_excerpts",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		sourceId: integer("source_id")
			.notNull()
			.references(() => sources.id, { onDelete: "restrict" }),

		locator: text("locator"),

		text: text("text").notNull(),
	},
	(table) => [
		index("source_excerpts_source_id_idx").on(table.sourceId),

		check(
			"source_excerpts_locator_not_empty_check",
			sql`${table.locator} IS NULL OR btrim(${table.locator}) <> ''`,
		),

		check(
			"source_excerpts_text_not_empty_check",
			sql`btrim(${table.text}) <> ''`,
		),
	],
);
