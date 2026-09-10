import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";

import { themes } from "./themes";

export const themeRelationships = pgTable(
	"theme_relationships",
	{
		sourceThemeId: integer("source_theme_id")
			.notNull()
			.references(() => themes.id, {
				onDelete: "cascade",
			}),

		targetThemeId: integer("target_theme_id")
			.notNull()
			.references(() => themes.id, {
				onDelete: "cascade",
			}),

		/**
		 * The semantic relationship from source → target.
		 *
		 * Examples:
		 * broader_than
		 * narrower_than
		 * related_to
		 */
		relationshipType: text("relationship_type").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [
				table.sourceThemeId,
				table.targetThemeId,
				table.relationshipType,
			],
		}),

		index("theme_relationships_target_theme_id_idx").on(table.targetThemeId),

		check(
			"theme_relationships_different_themes",
			sql`${table.sourceThemeId} <> ${table.targetThemeId}`,
		),

		check(
			"theme_relationships_relationship_type_not_blank",
			sql`btrim(${table.relationshipType}) <> ''`,
		),

		check(
			"theme_relationships_relationship_type_valid",
			sql`${table.relationshipType} IN (
				'broader_than',
				'narrower_than',
				'related_to'
			)`,
		),
	],
);
