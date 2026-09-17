import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { passages } from "./passages";
import { testimonies } from "./testimonies";

export const testimonyPassages = pgTable(
	"testimony_passages",
	{
		testimonyId: integer("testimony_id")
			.notNull()
			.references(() => testimonies.id, {
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
			columns: [table.testimonyId, table.passageId],
		}),

		index("testimony_passages_passage_id_idx").on(table.passageId),
	],
);
