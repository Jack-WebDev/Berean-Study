import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { passages } from "./passages";
import { themes } from "./themes";

export const themePassages = pgTable(
	"theme_passages",
	{
		themeId: integer("theme_id")
			.notNull()
			.references(() => themes.id, {
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
			columns: [table.themeId, table.passageId],
		}),

		index("theme_passages_passage_id_idx").on(table.passageId),
	],
);
