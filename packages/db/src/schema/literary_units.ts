import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	check,
	index,
	integer,
	pgTable,
} from "drizzle-orm/pg-core";

import { passages } from "./passages";

export const literaryUnits = pgTable(
	"literary_units",
	{
		passageId: integer("passage_id")
			.primaryKey()
			.references(() => passages.id, {
				onDelete: "restrict",
			}),

		parentPassageId: integer("parent_passage_id").references(
			(): AnyPgColumn => literaryUnits.passageId,
			{
				onDelete: "restrict",
			},
		),
	},
	(table) => [
		check(
			"literary_units_not_self_parent_check",
			sql`${table.parentPassageId} IS NULL OR ${table.parentPassageId} <> ${table.passageId}`,
		),

		index("literary_units_parent_passage_id_idx").on(table.parentPassageId),
	],
);
