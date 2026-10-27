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

		/**
		 * Free text for now (Request, Thanksgiving, or the member's own word).
		 * TODO: move these into a table a superadmin manages in the app, so the
		 * suggested list can change without a code release.
		 */
		category: text("category"),

		/** Who the prayer is for; empty when the member is praying for themselves. */
		prayingFor: text("praying_for"),

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
		index("prayers_user_created_at_idx").on(table.userId, table.createdAt),
		unique("prayers_id_user_id_unique").on(table.id, table.userId),

		check("prayers_title_not_blank", sql`btrim(${table.title}) <> ''`),

		check("prayers_content_not_blank", sql`btrim(${table.content}) <> ''`),
	],
);
