import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { passages } from "./passages";
import { places } from "./places";

/**
 * Connects a place to biblical passages where it appears
 * or is materially relevant.
 */
export const placePassages = pgTable(
	"place_passages",
	{
		placeId: integer("place_id")
			.notNull()
			.references(() => places.id, {
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
			columns: [table.placeId, table.passageId],
		}),

		index("place_passages_passage_id_idx").on(table.passageId),
	],
);
