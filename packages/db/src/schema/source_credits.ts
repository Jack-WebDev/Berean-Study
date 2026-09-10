import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	unique,
} from "drizzle-orm/pg-core";
import { creditedPeople } from "./credited_people";
import { sources } from "./sources";

export const sourceCredits = pgTable(
	"source_credits",
	{
		sourceId: integer("source_id")
			.notNull()
			.references(() => sources.id, { onDelete: "cascade" }),

		creditedPersonId: integer("credited_person_id")
			.notNull()
			.references(() => creditedPeople.id, { onDelete: "restrict" }),

		role: text().notNull(),

		position: integer().notNull(),
	},
	(table) => [
		primaryKey({
			name: "source_credits_pk",
			columns: [table.sourceId, table.creditedPersonId, table.role],
		}),

		unique("source_credits_source_position_unique").on(
			table.sourceId,
			table.position,
		),

		index("source_credits_credited_person_id_idx").on(table.creditedPersonId),

		check(
			"source_credits_role_not_empty_check",
			sql`btrim(${table.role}) <> ''`,
		),

		check("source_credits_position_positive_check", sql`${table.position} > 0`),
	],
);
