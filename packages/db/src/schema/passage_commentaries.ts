import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";

import { passages } from "./passages";

export const passageCommentaries = pgTable(
	"passage_commentaries",
	{
		passageId: integer("passage_id")
			.primaryKey()
			.references(() => passages.id, {
				onDelete: "restrict",
			}),

		content: text().notNull(),
	},
	(table) => [
		check(
			"passage_commentaries_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),
	],
);
