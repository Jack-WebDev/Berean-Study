import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { prayers } from "./prayers";

export const prayerReflections = pgTable(
	"prayer_reflections",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		prayerId: integer("prayer_id")
			.notNull()
			.references(() => prayers.id, {
				onDelete: "cascade",
			}),

		content: text("content").notNull(),

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
	],
);
