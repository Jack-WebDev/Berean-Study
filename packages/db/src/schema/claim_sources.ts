import { sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

import { claims } from "./claims";
import { sources } from "./sources";

export const claimSources = pgTable(
	"claim_sources",
	{
		claimId: integer()
			.notNull()
			.references(() => claims.id, {
				onDelete: "cascade",
			}),

		sourceId: integer()
			.notNull()
			.references(() => sources.id, {
				onDelete: "restrict",
			}),

		relationship: text().notNull(),

		locator: text(),
	},
	(table) => [
		primaryKey({
			columns: [table.claimId, table.sourceId],
		}),

		check(
			"claim_sources_relationship_check",
			sql`${table.relationship} IN ('supports', 'disputes', 'discusses')`,
		),

		check(
			"claim_sources_locator_not_empty_check",
			sql`${table.locator} IS NULL OR btrim(${table.locator}) <> ''`,
		),
	],
);
