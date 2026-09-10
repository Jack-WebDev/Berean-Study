import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { biblicalPeople } from "./biblical_people";
import { events } from "./events";

/**
 * People participating in or materially associated with an event.
 */
export const eventPeople = pgTable(
	"event_people",
	{
		eventId: integer("event_id")
			.notNull()
			.references(() => events.id, {
				onDelete: "cascade",
			}),

		personId: integer("person_id")
			.notNull()
			.references(() => biblicalPeople.id, {
				onDelete: "restrict",
			}),
	},
	(table) => [
		primaryKey({
			columns: [table.eventId, table.personId],
		}),

		index("event_people_person_id_idx").on(table.personId),
	],
);
