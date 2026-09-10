import { relations } from "drizzle-orm";
import { foreignKey, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { bookIntroductionSections } from "./book_introduction_sections";
import { contentRevisions } from "./content_revisions";

/** The currently published revision for a book-introduction section. */
export const publishedBookIntroductionSections = pgTable(
	"published_book_introduction_sections",
	{
		bookIntroductionSectionId: integer(
			"book_introduction_section_id",
		).notNull(),

		contentRevisionId: integer("content_revision_id").notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.bookIntroductionSectionId] }),
		foreignKey({
			columns: [table.bookIntroductionSectionId],
			foreignColumns: [bookIntroductionSections.id],
			name: "published_book_intro_sections_section_fk",
		}).onDelete("restrict"),
		foreignKey({
			columns: [table.contentRevisionId, table.bookIntroductionSectionId],
			foreignColumns: [
				contentRevisions.id,
				contentRevisions.bookIntroductionSectionId,
			],
			name: "published_book_intro_sections_revision_target_fk",
		}).onDelete("restrict"),
	],
);

export const publishedBookIntroductionSectionsRelations = relations(
	publishedBookIntroductionSections,
	({ one }) => ({
		section: one(bookIntroductionSections, {
			fields: [publishedBookIntroductionSections.bookIntroductionSectionId],
			references: [bookIntroductionSections.id],
		}),
		revision: one(contentRevisions, {
			fields: [publishedBookIntroductionSections.contentRevisionId],
			references: [contentRevisions.id],
		}),
	}),
);
