import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text } from "drizzle-orm/pg-core";

import { interpretiveQuestions } from "./interpretative_questions";

export const interpretationViews = pgTable(
	"interpretation_views",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		interpretiveQuestionId: integer("interpretive_question_id")
			.notNull()
			.references(() => interpretiveQuestions.id, {
				onDelete: "cascade",
			}),

		name: text("name").notNull(),

		content: text("content").notNull(),
	},
	(table) => [
		check(
			"interpretation_views_name_not_empty_check",
			sql`btrim(${table.name}) <> ''`,
		),

		check(
			"interpretation_views_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),

		index("interpretation_views_interpretive_question_id_idx").on(
			table.interpretiveQuestionId,
		),
	],
);
