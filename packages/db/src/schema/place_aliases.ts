import { sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { places } from "./places";

/**
 * Alternative names by which a biblical place is known.
 *
 * Examples:
 * Sea of Galilee -> Sea of Tiberias
 * Sea of Galilee -> Lake of Gennesaret
 * Jerusalem -> Zion (where used as a geographic designation)
 */
export const placeAliases = pgTable(
	"place_aliases",
	{
		placeId: integer("place_id")
			.notNull()
			.references(() => places.id, {
				onDelete: "cascade",
			}),

		alias: text("alias").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.placeId, table.alias],
		}),

		check("place_aliases_alias_not_blank", sql`btrim(${table.alias}) <> ''`),
	],
);
