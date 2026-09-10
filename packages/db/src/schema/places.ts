import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";

/**
 * A geographic place relevant to the biblical text.
 *
 * Examples:
 * Jerusalem
 * Bethlehem
 * Egypt
 * Sea of Galilee
 * Mount Sinai
 */
export const places = pgTable(
	"places",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		/**
		 * Primary display name used by Berean Study.
		 */
		name: text("name").notNull(),
	},
	(table) => [check("places_name_not_blank", sql`btrim(${table.name}) <> ''`)],
);
