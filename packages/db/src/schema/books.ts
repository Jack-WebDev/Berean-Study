import { relations, sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";
import type { BookGroup } from "../scripture-catalogue";
import { chapters } from "./chapters";
import { passages } from "./passages";

export const books = pgTable(
	"books",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		name: text().notNull(),

		slug: text().notNull(),

		testament: text().$type<"old" | "new">().notNull(),

		/** Compact name for tight spaces, such as "Rom". */
		shortName: text("short_name"),

		fullTitle: text("full_title"),

		bookGroup: text("book_group").$type<BookGroup>(),

		/**
		 * KJV totals, used to measure how much has been entered. Chapters and
		 * verses themselves are only created when someone enters them.
		 */
		expectedChapters: integer("expected_chapters"),

		expectedVerses: integer("expected_verses"),
	},
	(table) => [
		unique("books_name_unique").on(table.name),

		unique("books_slug_unique").on(table.slug),

		check("books_testament_check", sql`${table.testament} IN ('old', 'new')`),

		check("books_name_not_empty_check", sql`btrim(${table.name}) <> ''`),

		check("books_slug_not_empty_check", sql`btrim(${table.slug}) <> ''`),
		check(
			"books_short_name_not_blank_check",
			sql`${table.shortName} IS NULL OR btrim(${table.shortName}) <> ''`,
		),
		check(
			"books_full_title_not_blank_check",
			sql`${table.fullTitle} IS NULL OR btrim(${table.fullTitle}) <> ''`,
		),
	],
);

export const booksRelations = relations(books, ({ many }) => ({
	chapters: many(chapters),
	passages: many(passages),
}));
