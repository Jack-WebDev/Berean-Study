import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";
import { places } from "./places";

/**
 * Geographic relationships between places.
 *
 * Examples:
 * Bethlehem located_in Judea
 * Judea part_of Roman Empire
 * Mount Zion within Jerusalem
 */
export const placeRelationships = pgTable(
	"place_relationships",
	{
		sourcePlaceId: integer("source_place_id")
			.notNull()
			.references(() => places.id, {
				onDelete: "cascade",
			}),

		targetPlaceId: integer("target_place_id")
			.notNull()
			.references(() => places.id, {
				onDelete: "cascade",
			}),

		relationshipType: text("relationship_type").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [
				table.sourcePlaceId,
				table.targetPlaceId,
				table.relationshipType,
			],
		}),

		index("place_relationships_target_place_id_idx").on(table.targetPlaceId),

		check(
			"place_relationships_different_places",
			sql`${table.sourcePlaceId} <> ${table.targetPlaceId}`,
		),

		check(
			"place_relationships_relationship_type_not_blank",
			sql`btrim(${table.relationshipType}) <> ''`,
		),
	],
);
