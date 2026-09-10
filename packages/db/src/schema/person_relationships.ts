import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";
import { biblicalPeople } from "./biblical_people";

/**
 * Explicit relationships between biblical people.
 *
 * Direction matters:
 *
 * Abraham --father_of--> Isaac
 * Sarah   --mother_of--> Isaac
 * David   --father_of--> Solomon
 */
export const personRelationships = pgTable(
	"person_relationships",
	{
		sourcePersonId: integer("source_person_id")
			.notNull()
			.references(() => biblicalPeople.id, {
				onDelete: "cascade",
			}),

		targetPersonId: integer("target_person_id")
			.notNull()
			.references(() => biblicalPeople.id, {
				onDelete: "cascade",
			}),

		relationshipType: text("relationship_type").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [
				table.sourcePersonId,
				table.targetPersonId,
				table.relationshipType,
			],
		}),

		index("person_relationships_target_person_id_idx").on(table.targetPersonId),

		check(
			"person_relationships_different_people",
			sql`${table.sourcePersonId} <> ${table.targetPersonId}`,
		),

		check(
			"person_relationships_relationship_type_not_blank",
			sql`btrim(${table.relationshipType}) <> ''`,
		),
	],
);
