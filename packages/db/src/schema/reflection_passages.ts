import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { passages } from "./passages";
import { prayerReflections } from "./prayer_reflections";

/** The verses quoted in a reflection, kept in step with its verse blocks. */
export const reflectionPassages = pgTable(
	"reflection_passages",
	{
		reflectionId: integer("reflection_id")
			.notNull()
			.references(() => prayerReflections.id, {
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
			columns: [table.reflectionId, table.passageId],
		}),

		index("reflection_passages_passage_id_idx").on(table.passageId),
	],
);
