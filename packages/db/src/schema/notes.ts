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

export const notes = pgTable(
	"notes",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		title: text().notNull().default(""),

		/** Autosave keeps a note in draft until the member saves it. */
		status: text().$type<"draft" | "saved">().notNull().default("draft"),

		/** What kind of study the note is; unset until the member picks one. */
		purpose: text().$type<
			"application" | "observation" | "prayer" | "reflection"
		>(),

		/** Set while the member keeps the note at the top of their list. */
		pinnedAt: timestamp("pinned_at", { withTimezone: true }),

		content: text().notNull(),

		/**
		 * The body's words without its JSON structure, so searching for "text"
		 * or "paragraph" doesn't match every note. Rewritten on every save.
		 */
		searchText: text("search_text").notNull().default(""),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),

		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("notes_user_id_idx").on(table.userId),
		unique("notes_id_user_id_unique").on(table.id, table.userId),

		check("notes_content_not_empty_check", sql`btrim(${table.content}) <> ''`),
		check("notes_status_check", sql`${table.status} IN ('draft', 'saved')`),
		check(
			"notes_purpose_check",
			sql`${table.purpose} IS NULL OR ${table.purpose} IN ('observation', 'reflection', 'application', 'prayer')`,
		),
		check(
			"notes_saved_title_check",
			sql`${table.status} = 'draft' OR btrim(${table.title}) <> ''`,
		),
	],
);
