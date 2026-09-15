import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { collections } from "./collections";
import { passages } from "./passages";

/** Links existing Scripture passages to a collection without copying Scripture data. */
export const collectionPassages = pgTable(
	"collection_passages",
	{
		collectionId: integer("collection_id")
			.notNull()
			.references(() => collections.id, { onDelete: "cascade" }),
		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.collectionId, table.passageId] }),
		index("collection_passages_passage_id_idx").on(table.passageId),
	],
);
