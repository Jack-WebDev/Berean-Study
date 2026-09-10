import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

export const versificationSystems = pgTable(
	"versification_systems",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		name: text().notNull(),

		slug: text().notNull(),
	},
	(table) => [
		unique("versification_systems_name_unique").on(table.name),

		unique("versification_systems_slug_unique").on(table.slug),

		check(
			"versification_systems_name_not_empty_check",
			sql`btrim(${table.name}) <> ''`,
		),

		check(
			"versification_systems_slug_not_empty_check",
			sql`btrim(${table.slug}) <> ''`,
		),
	],
);
