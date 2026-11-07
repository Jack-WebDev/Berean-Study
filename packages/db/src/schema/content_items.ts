import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	check,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";

import { contentRevisions } from "./content_revisions";

/**
 * One piece of reviewed content, such as the overview of Romans. Its wording lives
 * in revisions, and `liveRevisionId` says which one readers see, if any.
 */
export const contentItems = pgTable(
	"content_items",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		kind: text().notNull(),

		/** What it's about, in the kind's own terms, such as a book's slug. */
		scopeKey: text("scope_key").notNull(),

		title: text().notNull(),

		liveRevisionId: integer("live_revision_id").references(
			(): AnyPgColumn => contentRevisions.id,
			{ onDelete: "restrict" },
		),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		unique("content_items_kind_scope_unique").on(table.kind, table.scopeKey),

		check(
			"content_items_title_not_blank_check",
			sql`btrim(${table.title}) <> ''`,
		),
	],
);
