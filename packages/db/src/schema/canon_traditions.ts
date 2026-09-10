import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

export const canonTraditions = pgTable(
	"canon_traditions",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		name: text().notNull(),

		slug: text().notNull(),
	},
	(table) => [
		unique("canon_traditions_name_unique").on(table.name),

		unique("canon_traditions_slug_unique").on(table.slug),

		check(
			"canon_traditions_name_not_empty_check",
			sql`btrim(${table.name}) <> ''`,
		),

		check(
			"canon_traditions_slug_not_empty_check",
			sql`btrim(${table.slug}) <> ''`,
		),
	],
);
