import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";

import type { VersePresenceKind } from "../scripture-catalogue";
import { translations } from "./translations";
import { verses } from "./verses";

/**
 * Exceptions to the shared verse numbering. All six translations use the same
 * chapters and verses, and most verses appear in all of them, so only the
 * differences are stored. For example, KJV includes 3 John 1:15 inside 1:14.
 */
export const versePresence = pgTable(
	"verse_presence",
	{
		verseId: integer("verse_id")
			.notNull()
			.references(() => verses.id, { onDelete: "restrict" }),

		translationId: integer("translation_id")
			.notNull()
			.references(() => translations.id, { onDelete: "restrict" }),

		kind: text().$type<VersePresenceKind>().notNull(),

		includedInVerseId: integer("included_in_verse_id").references(
			() => verses.id,
			{ onDelete: "restrict" },
		),
	},
	(table) => [
		primaryKey({ columns: [table.verseId, table.translationId] }),

		check(
			"verse_presence_kind_check",
			sql`${table.kind} IN (
				'included_in',
				'omitted_footnote',
				'bracketed',
				'not_in_translation'
			)`,
		),

		check(
			"verse_presence_included_in_check",
			sql`(${table.kind} = 'included_in') = (${table.includedInVerseId} IS NOT NULL)`,
		),

		index("verse_presence_translation_idx").on(table.translationId),
	],
);
