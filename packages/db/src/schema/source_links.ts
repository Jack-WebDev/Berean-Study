import { sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

import { sources } from "./sources";

export const sourceLinks = pgTable(
	"source_links",
	{
		sourceId: integer("source_id")
			.notNull()
			.references(() => sources.id, { onDelete: "cascade" }),

		url: text("url").notNull(),

		kind: text("kind").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.sourceId, table.url],
			name: "source_links_pkey",
		}),

		check("source_links_url_not_empty_check", sql`btrim(${table.url}) <> ''`),

		check("source_links_kind_not_empty_check", sql`btrim(${table.kind}) <> ''`),
	],
);
