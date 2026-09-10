import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";

/**
 * A person identified within the biblical text.
 *
 * Examples:
 * Abraham
 * Sarah
 * Moses
 * David
 * Mary Magdalene
 * Paul
 */
export const biblicalPeople = pgTable(
	"biblical_people",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		/**
		 * Primary display name used by Berean Study.
		 */
		name: text("name").notNull(),
	},
	(table) => [
		check("biblical_people_name_not_blank", sql`btrim(${table.name}) <> ''`),
	],
);
