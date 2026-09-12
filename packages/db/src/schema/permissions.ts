import { sql } from "drizzle-orm";
import {
	check,
	integer,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const permissions = pgTable(
	"permissions",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		key: text("key").notNull(),

		name: text("name").notNull(),

		category: text("category").notNull(),

		description: text("description"),
	},
	(table) => [
		uniqueIndex("permissions_key_unique").on(table.key),

		check(
			"permissions_key_valid",
			sql`
                btrim(${table.key}) <> ''
                AND ${table.key} = lower(${table.key})
            `,
		),

		check("permissions_name_not_blank", sql`btrim(${table.name}) <> ''`),

		check(
			"permissions_category_not_blank",
			sql`btrim(${table.category}) <> ''`,
		),

		check(
			"permissions_description_not_blank",
			sql`${table.description} IS NULL OR btrim(${table.description}) <> ''`,
		),
	],
);
