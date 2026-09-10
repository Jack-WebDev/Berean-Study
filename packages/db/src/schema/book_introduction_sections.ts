import { relations, sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

import { bookIntroductions } from "./book_introductions";
import { contentRevisions } from "./content_revisions";
import { publishedBookIntroductionSections } from "./published_book_introduction_sections";

export const bookIntroductionSections = pgTable(
	"book_introduction_sections",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		bookId: integer("book_id")
			.notNull()
			.references(() => bookIntroductions.bookId, {
				onDelete: "restrict",
			}),

		type: text().notNull(),

		title: text().notNull(),

		content: text().notNull(),

		position: integer().notNull(),
	},
	(table) => [
		unique("book_introduction_sections_book_type_unique").on(
			table.bookId,
			table.type,
		),

		unique("book_introduction_sections_book_position_unique").on(
			table.bookId,
			table.position,
		),

		check(
			"book_introduction_sections_type_not_empty_check",
			sql`btrim(${table.type}) <> ''`,
		),

		check(
			"book_introduction_sections_title_not_empty_check",
			sql`btrim(${table.title}) <> ''`,
		),

		check(
			"book_introduction_sections_content_not_empty_check",
			sql`btrim(${table.content}) <> ''`,
		),

		check(
			"book_introduction_sections_position_positive_check",
			sql`${table.position} > 0`,
		),
	],
);

export const bookIntroductionSectionsRelations = relations(
	bookIntroductionSections,
	({ one, many }) => ({
		introduction: one(bookIntroductions, {
			fields: [bookIntroductionSections.bookId],
			references: [bookIntroductions.bookId],
		}),
		revisions: many(contentRevisions, {
			relationName: "bookIntroductionSectionRevisions",
		}),
		published: one(publishedBookIntroductionSections),
	}),
);
