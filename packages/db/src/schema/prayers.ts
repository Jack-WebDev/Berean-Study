import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const prayers = pgTable(
	"prayers",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		title: text("title").notNull(),

		content: text("content").notNull(),

		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),

		updatedAt: timestamp("updated_at", {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("prayers_user_created_at_idx").on(table.userId, table.createdAt),
		unique("prayers_id_user_id_unique").on(table.id, table.userId),

		check("prayers_title_not_blank", sql`btrim(${table.title}) <> ''`),

		check("prayers_content_not_blank", sql`btrim(${table.content}) <> ''`),
	],
);
