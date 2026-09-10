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

/**
 * A user-created ordered Bible study.
 *
 * Examples:
 * "Romans and Justification"
 * "Messianic Psalms"
 * "Covenant Study"
 */
export const studyTrails = pgTable(
	"study_trails",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		title: text("title").notNull(),

		createdAt: timestamp("created_at").defaultNow().notNull(),

		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("study_trails_user_id_idx").on(table.userId),

		check("study_trails_title_not_blank", sql`btrim(${table.title}) <> ''`),
	],
);
