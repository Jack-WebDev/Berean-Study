import { sql } from "drizzle-orm";

import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { passages } from "./passages";
import { studyTrails } from "./study_trails";

/**
 * Ordered passages belonging to a study trail.
 *
 * Example:
 *
 * Romans and Justification
 * 1. Romans 1:16-17
 * 2. Romans 3:21-26
 * 3. Romans 4:1-8
 * 4. Romans 5:1-11
 */
export const studyTrailItems = pgTable(
	"study_trail_items",
	{
		studyTrailId: integer("study_trail_id")
			.notNull()
			.references(() => studyTrails.id, {
				onDelete: "cascade",
			}),

		position: integer("position").notNull(),

		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, {
				onDelete: "restrict",
			}),
	},
	(table) => [
		primaryKey({
			columns: [table.studyTrailId, table.position],
		}),

		uniqueIndex("study_trail_items_trail_passage_unique").on(
			table.studyTrailId,
			table.passageId,
		),

		index("study_trail_items_passage_id_idx").on(table.passageId),

		check("study_trail_items_position_positive", sql`${table.position} > 0`),
	],
);
