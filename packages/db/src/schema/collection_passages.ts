import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	timestamp,
} from "drizzle-orm/pg-core";

import { collectionSections } from "./collection_sections";
import { collections } from "./collections";
import { passages } from "./passages";

/** Links existing Scripture passages to a collection without copying Scripture data. */
export const collectionPassages = pgTable(
	"collection_passages",
	{
		collectionId: integer("collection_id")
			.notNull()
			.references(() => collections.id, { onDelete: "cascade" }),
		passageId: integer("passage_id")
			.notNull()
			.references(() => passages.id, { onDelete: "cascade" }),
		/**
		 * Empty for passages that sit outside any section. The section must
		 * belong to the same collection; the app checks that on every write.
		 */
		sectionId: integer("section_id").references(() => collectionSections.id, {
			onDelete: "set null",
		}),
		/** The passage's place within its section (or among unsectioned passages). */
		position: integer().notNull().default(0),
		/** When the member marked the passage as read; empty while unread. */
		readAt: timestamp("read_at", { withTimezone: true }),
		addedAt: timestamp("added_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.collectionId, table.passageId] }),
		index("collection_passages_passage_id_idx").on(table.passageId),
		index("collection_passages_section_id_idx").on(table.sectionId),
		check("collection_passages_position_check", sql`${table.position} >= 0`),
	],
);
