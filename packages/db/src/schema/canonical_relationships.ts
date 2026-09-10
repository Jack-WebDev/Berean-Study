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

export const canonicalRelationships = pgTable(
	"canonical_relationships",
	{
		sourcePassageId: integer("source_passage_id")
			.notNull()
			.references(() => passages.id, { onDelete: "restrict" }),

		targetPassageId: integer("target_passage_id")
			.notNull()
			.references(() => passages.id, { onDelete: "restrict" }),

		relationshipType: text("relationship_type").notNull(),

		explanation: text("explanation").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [
				table.sourcePassageId,
				table.targetPassageId,
				table.relationshipType,
			],
		}),

		check(
			"canonical_relationships_no_self_reference_check",
			sql`${table.sourcePassageId} <> ${table.targetPassageId}`,
		),

		check(
			"canonical_relationships_relationship_type_not_empty_check",
			sql`btrim(${table.relationshipType}) <> ''`,
		),

		check(
			"canonical_relationships_explanation_not_empty_check",
			sql`btrim(${table.explanation}) <> ''`,
		),

		index("canonical_relationships_target_passage_id_idx").on(
			table.targetPassageId,
		),
	],
);
