import { relations } from "drizzle-orm";
import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { passages } from "./passages";
import { verses } from "./verses";
import { versificationSystems } from "./versification_systems";

export const passageRanges = pgTable(
	"passage_ranges",
	{
		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, { onDelete: "restrict" }),

		versificationSystemId: integer("versification_system_id")
			.notNull()
			.references(() => versificationSystems.id, {
				onDelete: "restrict",
			}),

		startVerseId: integer("start_verse_id")
			.notNull()
			.references(() => verses.id, { onDelete: "restrict" }),

		endVerseId: integer("end_verse_id")
			.notNull()
			.references(() => verses.id, { onDelete: "restrict" }),
	},
	(table) => [
		primaryKey({
			name: "passage_ranges_pk",
			columns: [table.passageId, table.versificationSystemId],
		}),

		index("passage_ranges_start_verse_id_idx").on(table.startVerseId),

		index("passage_ranges_end_verse_id_idx").on(table.endVerseId),
	],
);

export const passageRangesRelations = relations(passageRanges, ({ one }) => ({
	passage: one(passages, {
		fields: [passageRanges.passageId],
		references: [passages.id],
	}),
	versificationSystem: one(versificationSystems, {
		fields: [passageRanges.versificationSystemId],
		references: [versificationSystems.id],
	}),
	startVerse: one(verses, {
		fields: [passageRanges.startVerseId],
		references: [verses.id],
		relationName: "passageRangeStartVerse",
	}),
	endVerse: one(verses, {
		fields: [passageRanges.endVerseId],
		references: [verses.id],
		relationName: "passageRangeEndVerse",
	}),
}));
