import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text } from "drizzle-orm/pg-core";

import { collections } from "./collections";

/** A named group of passages inside a collection, such as "I. Crying out". */
export const collectionSections = pgTable(
	"collection_sections",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		collectionId: integer("collection_id")
			.notNull()
			.references(() => collections.id, { onDelete: "cascade" }),
		title: text().notNull(),
		/** The section's place in the collection, starting at 0. */
		position: integer().notNull(),
	},
	(table) => [
		index("collection_sections_collection_id_position_idx").on(
			table.collectionId,
			table.position,
		),
		check(
			"collection_sections_title_not_empty_check",
			sql`btrim(${table.title}) <> ''`,
		),
		check("collection_sections_position_check", sql`${table.position} >= 0`),
	],
);
