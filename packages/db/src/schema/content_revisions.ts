import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { bookIntroductionSections } from "./book_introduction_sections";
import { passageCommentaries } from "./passage_commentaries";
import { passageCommentarySections } from "./passage_commentary_sections";
import { verseCommentaries } from "./verse_commentaries";
import { verseCommentarySections } from "./verse_commentary_sections";

export const contentRevisions = pgTable(
	"content_revisions",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		content: text("content").notNull(),

		createdByUserId: text("created_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),

		bookIntroductionSectionId: integer(
			"book_introduction_section_id",
		).references(() => bookIntroductionSections.id, {
			onDelete: "restrict",
		}),

		passageCommentaryId: integer("passage_commentary_id").references(
			() => passageCommentaries.passageId,
			{ onDelete: "restrict" },
		),

		passageCommentarySectionId: integer(
			"passage_commentary_section_id",
		).references(() => passageCommentarySections.id, {
			onDelete: "restrict",
		}),

		verseCommentaryId: integer("verse_commentary_id").references(
			() => verseCommentaries.passageId,
			{ onDelete: "restrict" },
		),

		verseCommentarySectionId: integer("verse_commentary_section_id").references(
			() => verseCommentarySections.id,
			{
				onDelete: "restrict",
			},
		),
	},
	(table) => [
		check(
			"content_revisions_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),

		check(
			"content_revisions_exactly_one_target_check",
			sql`num_nonnulls(
				${table.bookIntroductionSectionId},
				${table.passageCommentaryId},
				${table.passageCommentarySectionId},
				${table.verseCommentaryId},
				${table.verseCommentarySectionId}
			) = 1`,
		),

		index("content_revisions_book_intro_section_idx")
			.on(table.bookIntroductionSectionId, table.createdAt)
			.where(sql`${table.bookIntroductionSectionId} IS NOT NULL`),

		index("content_revisions_passage_commentary_idx")
			.on(table.passageCommentaryId, table.createdAt)
			.where(sql`${table.passageCommentaryId} IS NOT NULL`),

		index("content_revisions_passage_commentary_section_idx")
			.on(table.passageCommentarySectionId, table.createdAt)
			.where(sql`${table.passageCommentarySectionId} IS NOT NULL`),

		index("content_revisions_verse_commentary_idx")
			.on(table.verseCommentaryId, table.createdAt)
			.where(sql`${table.verseCommentaryId} IS NOT NULL`),

		index("content_revisions_verse_commentary_section_idx")
			.on(table.verseCommentarySectionId, table.createdAt)
			.where(sql`${table.verseCommentarySectionId} IS NOT NULL`),
	],
);
