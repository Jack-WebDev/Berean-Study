import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { historicalPeriods } from "./historical_periods";

/**
 * A historical or narrative event relevant to Scripture.
 *
 * Examples:
 * Exodus from Egypt
 * Fall of Jerusalem
 * Crucifixion of Jesus
 * Paul's conversion
 * Battle of Jericho
 */
export const events = pgTable(
	"events",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		name: text("name").notNull(),

		/**
		 * Optional because not every event can be confidently assigned
		 * to one broad historical period.
		 */
		historicalPeriodId: integer("historical_period_id").references(
			() => historicalPeriods.id,
			{
				onDelete: "restrict",
			},
		),
	},
	(table) => [
		index("events_historical_period_id_idx").on(table.historicalPeriodId),

		check("events_name_not_blank", sql`btrim(${table.name}) <> ''`),
	],
);
