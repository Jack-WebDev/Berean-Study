import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	integer,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const roles = pgTable(
	"roles",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		name: text("name").notNull(),

		description: text("description"),

		autoAssign: boolean("auto_assign").notNull().default(false),
	},
	(table) => [
		uniqueIndex("roles_name_unique").on(sql`lower(${table.name})`),

		check("roles_name_not_blank", sql`btrim(${table.name}) <> ''`),

		check(
			"roles_description_not_blank",
			sql`${table.description} IS NULL OR btrim(${table.description}) <> ''`,
		),
	],
);
