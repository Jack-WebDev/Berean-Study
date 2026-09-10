import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { events } from "./events";
import { passages } from "./passages";

/**
 * Passages that narrate, describe, or materially refer to an event.
 */
export const eventPassages = pgTable(
	"event_passages",
	{
		eventId: integer("event_id")
			.notNull()
			.references(() => events.id, {
				onDelete: "cascade",
			}),

		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, {
				onDelete: "restrict",
			}),
	},
	(table) => [
		primaryKey({
			columns: [table.eventId, table.passageId],
		}),

		index("event_passages_passage_id_idx").on(table.passageId),
	],
);
