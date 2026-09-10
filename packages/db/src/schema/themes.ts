import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

export const themes = pgTable(
	"themes",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		name: text().notNull(),

		slug: text().notNull(),
	},
	(table) => [
		unique("themes_name_unique").on(table.name),

		unique("themes_slug_unique").on(table.slug),

		check("themes_name_not_empty_check", sql`btrim(${table.name}) <> ''`),

		check("themes_slug_not_empty_check", sql`btrim(${table.slug}) <> ''`),
	],
);
