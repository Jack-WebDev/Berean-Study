import { sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { biblicalPeople } from "./biblical_people";

/**
 * Alternative names or forms by which a biblical person may be known.
 *
 * Examples:
 * Abram -> Abraham
 * Simon -> Peter
 * Cephas -> Peter
 * Saul -> Paul
 */
export const personAliases = pgTable(
	"person_aliases",
	{
		personId: integer("person_id")
			.notNull()
			.references(() => biblicalPeople.id, {
				onDelete: "cascade",
			}),

		alias: text("alias").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.personId, table.alias],
		}),

		check("person_aliases_alias_not_blank", sql`btrim(${table.alias}) <> ''`),
	],
);
