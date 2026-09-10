import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { biblicalPeople } from "./biblical_people";
import { passages } from "./passages";

/**
 * Connects biblical people to the passages in which they are relevant.
 *
 * This is intentionally passage-based rather than verse-based so it
 * can represent anything from a single verse to a larger literary unit.
 */
export const personPassages = pgTable(
	"person_passages",
	{
		personId: integer("person_id")
			.notNull()
			.references(() => biblicalPeople.id, {
				onDelete: "cascade",
			}),

		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, {
				onDelete: "cascade",
			}),
	},
	(table) => [
		primaryKey({
			columns: [table.personId, table.passageId],
		}),

		index("person_passages_passage_id_idx").on(table.passageId),
	],
);
