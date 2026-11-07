import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	check,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

/**
 * A theme's identity and standing. What it says, including its name and passages,
 * lives in its reviewed revisions.
 */
export const themes = pgTable(
	"themes",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		status: text().$type<"active" | "merged">().notNull().default("active"),

		/** Where to look instead, after two Superadmins merged this into another theme. */
		mergedIntoThemeId: integer("merged_into_theme_id").references(
			(): AnyPgColumn => themes.id,
			{ onDelete: "restrict" },
		),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		check("themes_status_check", sql`${table.status} IN ('active', 'merged')`),
	],
);
