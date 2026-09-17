import { and, asc, desc, eq } from "drizzle-orm";

import type { createDb } from "./index";
import { bookmarks } from "./schema/bookmarks";
import { books } from "./schema/books";
import { chapters } from "./schema/chapters";
import { highlights } from "./schema/highlights";
import { passages } from "./schema/passages";
import { translations } from "./schema/translations";
import { verseTexts } from "./schema/verse_texts";
import { verses } from "./schema/verses";

type DbClient = ReturnType<typeof createDb>;

export type SavedBookmark = {
	label: string;
	passageId: number;
};

export type SavedHighlight = {
	bookName: string;
	chapterNumber: number;
	endOffset: number;
	id: number;
	startOffset: number;
	text: string;
	translationAbbreviation: string;
	verseNumber: number;
};

export type SavedItems = {
	bookmarks: SavedBookmark[];
	highlights: SavedHighlight[];
};

/** Returns the authenticated member's saved highlights and bookmarks. */
export async function listSavedItems(
	db: DbClient,
	userId: string,
): Promise<SavedItems> {
	const [bookmarkRows, highlightRows] = await Promise.all([
		db
			.select({
				bookName: books.name,
				passageId: passages.id,
				passageTitle: passages.title,
			})
			.from(bookmarks)
			.innerJoin(passages, eq(passages.id, bookmarks.passageId))
			.innerJoin(books, eq(books.id, passages.bookId))
			.where(eq(bookmarks.userId, userId))
			.orderBy(asc(books.id), asc(passages.id)),
		db
			.select({
				bookName: books.name,
				chapterNumber: chapters.number,
				endOffset: highlights.endOffset,
				id: highlights.id,
				startOffset: highlights.startOffset,
				text: verseTexts.text,
				translationAbbreviation: translations.abbreviation,
				verseNumber: verses.number,
			})
			.from(highlights)
			.innerJoin(
				verseTexts,
				and(
					eq(verseTexts.translationId, highlights.translationId),
					eq(verseTexts.verseId, highlights.verseId),
				),
			)
			.innerJoin(verses, eq(verses.id, highlights.verseId))
			.innerJoin(chapters, eq(chapters.id, verses.chapterId))
			.innerJoin(books, eq(books.id, chapters.bookId))
			.innerJoin(translations, eq(translations.id, highlights.translationId))
			.where(eq(highlights.userId, userId))
			.orderBy(desc(highlights.id)),
	]);

	return {
		bookmarks: bookmarkRows.map((bookmark) => ({
			label: bookmark.passageTitle ?? bookmark.bookName,
			passageId: bookmark.passageId,
		})),
		highlights: highlightRows,
	};
}
