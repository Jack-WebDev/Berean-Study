import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";
import { versificationSystems } from "./versification_systems";

export const translations = pgTable(
	"translations",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		versificationSystemId: integer("versification_system_id")
			.notNull()
			.references(() => versificationSystems.id, {
				onDelete: "restrict",
			}),

		name: text().notNull(),

		abbreviation: text().notNull(),

		slug: text().notNull(),
	},
	(table) => [
		unique("translations_name_unique").on(table.name),

		unique("translations_abbreviation_unique").on(table.abbreviation),

		unique("translations_slug_unique").on(table.slug),

		check("translations_name_not_empty_check", sql`btrim(${table.name}) <> ''`),

		check(
			"translations_abbreviation_not_empty_check",
			sql`btrim(${table.abbreviation}) <> ''`,
		),

		check("translations_slug_not_empty_check", sql`btrim(${table.slug}) <> ''`),
	],
);
