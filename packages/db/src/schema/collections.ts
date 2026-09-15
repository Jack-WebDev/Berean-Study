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

/** A private user-owned study container for related Scripture material. */
export const collections = pgTable(
	"collections",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		name: text().notNull(),
		normalizedName: text("normalized_name").notNull(),
		description: text().notNull().default(""),
		coverId: text("cover_id").notNull(),
		allowedContent: text("allowed_content").array().notNull(),
		tags: text().array().notNull().default(sql`ARRAY[]::text[]`),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("collections_user_id_updated_at_idx").on(
			table.userId,
			table.updatedAt,
		),
		unique("collections_user_id_normalized_name_unique").on(
			table.userId,
			table.normalizedName,
		),
		check("collections_name_not_empty_check", sql`btrim(${table.name}) <> ''`),
		check(
			"collections_normalized_name_not_empty_check",
			sql`btrim(${table.normalizedName}) <> ''`,
		),
		check(
			"collections_cover_id_not_empty_check",
			sql`btrim(${table.coverId}) <> ''`,
		),
	],
);
