import { sql } from "drizzle-orm";
import {
	check,
	integer,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const languages = pgTable(
	"languages",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		/**
		 * Stable language code.
		 *
		 * Examples:
		 * hbo = Biblical Hebrew
		 * arc = Aramaic
		 * grc = Ancient Greek
		 */
		code: text("code").notNull(),

		name: text("name").notNull(),
	},
	(table) => [
		uniqueIndex("languages_code_unique").on(table.code),

		check("languages_code_not_blank", sql`btrim(${table.code}) <> ''`),

		check("languages_name_not_blank", sql`btrim(${table.name}) <> ''`),
	],
);
