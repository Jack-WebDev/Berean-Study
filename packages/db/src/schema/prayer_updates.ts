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

/** A short note added to a prayer as things change. */
export const prayerUpdates = pgTable(
	"prayer_updates",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		prayerId: integer("prayer_id")
			.notNull()
			.references(() => prayers.id, {
				onDelete: "cascade",
			}),

		text: text("text").notNull(),

		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),
	},
	(table) => [
		check("prayer_updates_text_not_blank", sql`btrim(${table.text}) <> ''`),

		index("prayer_updates_prayer_id_created_at_idx").on(
			table.prayerId,
			table.createdAt,
		),
	],
);
