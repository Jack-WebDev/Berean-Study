import { sql } from "drizzle-orm";
import {
	check,
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const testimonies = pgTable(
	"testimonies",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		title: text("title").notNull(),

		content: text("content").notNull(),

		/** When the story happened, to the month; the day is always the 1st. */
		happenedOn: date("happened_on"),

		/**
		 * The body's words without its JSON structure, for search and previews.
		 * Rewritten on every save.
		 */
		searchText: text("search_text").notNull().default(""),

		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),

		updatedAt: timestamp("updated_at", {
			withTimezone: true,
		})
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("testimonies_user_id_idx").on(table.userId),
		unique("testimonies_id_user_id_unique").on(table.id, table.userId),

		check("testimonies_title_not_blank", sql`btrim(${table.title}) <> ''`),

		check("testimonies_content_not_blank", sql`btrim(${table.content}) <> ''`),
	],
);
