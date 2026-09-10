import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";

/**
 * A broad historical period used to situate biblical events.
 *
 * Examples:
 * United Monarchy
 * Divided Monarchy
 * Babylonian Exile
 * Persian Period
 * Second Temple Period
 */
export const historicalPeriods = pgTable(
	"historical_periods",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		name: text("name").notNull(),
	},
	(table) => [
		check("historical_periods_name_not_blank", sql`btrim(${table.name}) <> ''`),
	],
);
