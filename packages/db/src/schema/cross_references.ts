import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";

import { passages } from "./passages";

export const crossReferences = pgTable(
	"cross_references",
	{
		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, { onDelete: "restrict" }),

		relatedPassageId: integer("related_passage_id")
			.notNull()
			.references(() => passages.id, { onDelete: "restrict" }),

		explanation: text("explanation").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.passageId, table.relatedPassageId],
		}),

		check(
			"cross_references_no_self_reference_check",
			sql`${table.passageId} <> ${table.relatedPassageId}`,
		),

		check(
			"cross_references_explanation_not_empty_check",
			sql`btrim(${table.explanation}) <> ''`,
		),

		index("cross_references_related_passage_id_idx").on(table.relatedPassageId),
	],
);
