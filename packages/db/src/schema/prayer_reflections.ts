import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { prayers } from "./prayers";

/**
 * A look back at a prayer. `prayerId` is empty for a free reflection, and
 * becomes empty if the prayer is deleted, so the member keeps what they wrote.
 */
export const prayerReflections = pgTable(
	"prayer_reflections",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		prayerId: integer("prayer_id").references(() => prayers.id, {
			onDelete: "set null",
		}),

		/** The guiding question the member chose, if any. */
		prompt: text("prompt"),

		content: text("content").notNull(),

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
	},
	(table) => [
		check(
			"prayer_reflections_content_not_blank",
			sql`btrim(${table.content}) <> ''`,
		),

		index("prayer_reflections_prayer_id_created_at_idx").on(
			table.prayerId,
			table.createdAt,
		),

		index("prayer_reflections_user_created_at_idx").on(
			table.userId,
			table.createdAt,
		),
	],
);
