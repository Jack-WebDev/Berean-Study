import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";

export const claims = pgTable(
	"claims",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		statement: text().notNull(),

		status: text().default("unverified").notNull(),
	},
	(table) => [
		check(
			"claims_statement_not_empty_check",
			sql`btrim(${table.statement}) <> ''`,
		),

		check(
			"claims_status_check",
			sql`${table.status} IN ('unverified', 'verified', 'rejected')`,
		),
	],
);
