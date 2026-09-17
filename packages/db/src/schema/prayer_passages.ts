import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { passages } from "./passages";
import { prayers } from "./prayers";

export const prayerPassages = pgTable(
	"prayer_passages",
	{
		prayerId: integer("prayer_id")
			.notNull()
			.references(() => prayers.id, {
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
			columns: [table.prayerId, table.passageId],
		}),

		index("prayer_passages_passage_id_idx").on(table.passageId),
	],
);
