import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";

export const creditedPeople = pgTable(
	"credited_people",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		name: text().notNull(),
	},
	(table) => [
		check(
			"credited_people_name_not_empty_check",
			sql`btrim(${table.name}) <> ''`,
		),
	],
);
