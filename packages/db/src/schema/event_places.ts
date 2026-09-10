import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { events } from "./events";
import { places } from "./places";

/**
 * Places associated with an event.
 */
export const eventPlaces = pgTable(
	"event_places",
	{
		eventId: integer("event_id")
			.notNull()
			.references(() => events.id, {
				onDelete: "cascade",
			}),

		placeId: integer("place_id")
			.notNull()
			.references(() => places.id, {
				onDelete: "restrict",
			}),
	},
	(table) => [
		primaryKey({
			columns: [table.eventId, table.placeId],
		}),

		index("event_places_place_id_idx").on(table.placeId),
	],
);
