import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text } from "drizzle-orm/pg-core";

import { passages } from "./passages";

export const interpretiveQuestions = pgTable(
	"interpretive_questions",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, {
				onDelete: "restrict",
			}),

		question: text("question").notNull(),
	},
	(table) => [
		check(
			"interpretive_questions_question_not_empty_check",
			sql`btrim(${table.question}) <> ''`,
		),

		index("interpretive_questions_passage_id_idx").on(table.passageId),
	],
);
