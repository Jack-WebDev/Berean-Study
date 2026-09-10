import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text } from "drizzle-orm/pg-core";

import { bookIntroductionSections } from "./book_introduction_sections";
import { passageCommentaries } from "./passage_commentaries";
import { passageCommentarySections } from "./passage_commentary_sections";
import { sources } from "./sources";
import { verseCommentaries } from "./verse_commentaries";
import { verseCommentarySections } from "./verse_commentary_sections";

export const citations = pgTable(
	"citations",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		sourceId: integer("source_id")
			.notNull()
			.references(() => sources.id, {
				onDelete: "restrict",
			}),

		locator: text("locator"),

		bookIntroductionSectionId: integer(
			"book_introduction_section_id",
		).references(() => bookIntroductionSections.id, {
			onDelete: "cascade",
		}),

		passageCommentaryId: integer("passage_commentary_id").references(
			() => passageCommentaries.passageId,
			{
				onDelete: "cascade",
			},
		),

		passageCommentarySectionId: integer(
			"passage_commentary_section_id",
		).references(() => passageCommentarySections.id, {
			onDelete: "cascade",
		}),

		verseCommentaryId: integer("verse_commentary_id").references(
			() => verseCommentaries.passageId,
			{
				onDelete: "cascade",
			},
		),

		verseCommentarySectionId: integer("verse_commentary_section_id").references(
			() => verseCommentarySections.id,
			{
				onDelete: "cascade",
			},
		),
	},
	(table) => [
		check(
			"citations_locator_not_empty_check",
			sql`
				${table.locator} IS NULL
				OR btrim(${table.locator}) <> ''
			`,
		),

		check(
			"citations_exactly_one_target_check",
			sql`
				num_nonnulls(
					${table.bookIntroductionSectionId},
					${table.passageCommentaryId},
					${table.passageCommentarySectionId},
					${table.verseCommentaryId},
					${table.verseCommentarySectionId}
				) = 1
			`,
		),

		index("citations_source_id_index").on(table.sourceId),

		index("citations_book_introduction_section_id_index")
			.on(table.bookIntroductionSectionId)
			.where(sql`${table.bookIntroductionSectionId} IS NOT NULL`),

		index("citations_passage_commentary_id_index")
			.on(table.passageCommentaryId)
			.where(sql`${table.passageCommentaryId} IS NOT NULL`),

		index("citations_passage_commentary_section_id_index")
			.on(table.passageCommentarySectionId)
			.where(sql`${table.passageCommentarySectionId} IS NOT NULL`),

		index("citations_verse_commentary_id_index")
			.on(table.verseCommentaryId)
			.where(sql`${table.verseCommentaryId} IS NOT NULL`),

		index("citations_verse_commentary_section_id_index")
			.on(table.verseCommentarySectionId)
			.where(sql`${table.verseCommentarySectionId} IS NOT NULL`),
	],
);
