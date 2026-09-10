import { integer, pgTable, text } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { canonTraditions } from "./canon_traditions";
import { translations } from "./translations";

export const userPreferences = pgTable("user_preferences", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),

	preferredCanonTraditionId: integer("preferred_canon_tradition_id").references(
		() => canonTraditions.id,
		{ onDelete: "set null" },
	),

	preferredTranslationId: integer("preferred_translation_id").references(
		() => translations.id,
		{ onDelete: "set null" },
	),
});
