import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text } from "drizzle-orm/pg-core";

import { claims } from "./claims";
import { sources } from "./sources";

export const claimSources = pgTable(
	"claim_sources",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		claimId: integer("claim_id")
			.notNull()
			.references(() => claims.id, {
				onDelete: "cascade",
			}),

		sourceId: integer("source_id")
			.notNull()
			.references(() => sources.id, {
				onDelete: "restrict",
			}),

		relationship: text().notNull(),

		locator: text(),
	},
	(table) => [
		index("claim_sources_claim_id_idx").on(table.claimId),

		index("claim_sources_source_id_idx").on(table.sourceId),

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
