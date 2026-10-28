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

export type CollectionType = "list" | "project" | "teaching";
export type CollectionVisibility = "private" | "shared" | "public";

/** The "stone" cover, which every existing collection starts with. */
export const defaultCollectionColor = "#efebe4";

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
		tags: text().array().notNull().default(sql`ARRAY[]::text[]`),

		/** How the collection is used; only study projects track progress. */
		type: text().$type<CollectionType>().notNull().default("list"),
		/**
		 * The cover's background colour as `#rrggbb`. The text colour and the
		 * dark-mode shade are worked out from it when the cover is drawn.
		 */
		color: text().notNull().default(defaultCollectionColor),
		visibility: text()
			.$type<CollectionVisibility>()
			.notNull()
			.default("private"),
		/** Set while the member keeps the collection at the top of the library. */
		pinnedAt: timestamp("pinned_at", { withTimezone: true }),
		/** Drives "Continue studying": the project the member was last in. */
		lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),

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
			"collections_type_check",
			sql`${table.type} IN ('list', 'project', 'teaching')`,
		),
		check(
			"collections_visibility_check",
			sql`${table.visibility} IN ('private', 'shared', 'public')`,
		),
		check("collections_color_check", sql`${table.color} ~ '^#[0-9a-f]{6}$'`),
	],
);
