import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

export const editorialChecklists = pgTable(
	"editorial_checklists",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		requirement: text("requirement").notNull(),

		position: integer("position").notNull(),
	},
	(table) => [
		unique("editorial_checklists_requirement_unique").on(table.requirement),

		unique("editorial_checklists_position_unique").on(table.position),

		check(
			"editorial_checklists_requirement_not_empty_check",
			sql`btrim(${table.requirement}) <> ''`,
		),

		check(
			"editorial_checklists_position_positive_check",
			sql`${table.position} > 0`,
		),
	],
);
