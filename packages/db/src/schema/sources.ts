import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	check,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * A book or article Berean Study relies on. This row is only its identity and
 * standing. What it says (title, authors, edition) lives in its reviewed
 * revisions, so changing those details goes through review like anything else.
 */
export const sources = pgTable(
	"sources",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		status: text()
			.$type<"active" | "merged" | "retired">()
			.notNull()
			.default("active"),

		/** Where to look instead, after this source was found to be a duplicate. */
		mergedIntoSourceId: integer("merged_into_source_id").references(
			(): AnyPgColumn => sources.id,
			{ onDelete: "restrict" },
		),

		retiredAt: timestamp("retired_at", { withTimezone: true }),

		createdByUserId: text("created_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		check(
			"sources_status_check",
			sql`${table.status} IN ('active', 'merged', 'retired')`,
		),

		check(
			"sources_merged_has_target_check",
			sql`(${table.status} = 'merged') = (${table.mergedIntoSourceId} IS NOT NULL)`,
		),

		check(
			"sources_retired_has_date_check",
			sql`(${table.status} = 'retired') = (${table.retiredAt} IS NOT NULL)`,
		),
	],
);
