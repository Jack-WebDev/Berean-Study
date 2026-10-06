import { and, asc, desc, eq } from "drizzle-orm";

import {
	listSavedCommunityPosts,
	type SavedCommunityPost,
	setCommunityPostBookmark,
} from "./community";
import type { db } from "./index";
import { bookmarks } from "./schema/bookmarks";
import { books } from "./schema/books";
import { chapters } from "./schema/chapters";
import { highlights } from "./schema/highlights";
import { passages } from "./schema/passages";
import { translations } from "./schema/translations";
import { verseTexts } from "./schema/verse_texts";
import { verses } from "./schema/verses";

type DbClient = typeof db;

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

export type SavedItemRemoval =
	| { kind: "scripture"; passageId: number }
	| { highlightId: number; kind: "highlight" }
	| { kind: "community"; postId: number };

export type SavedLibraryBookmark =
	| {
			identity: Extract<SavedItemRemoval, { kind: "scripture" }>;
			item: SavedBookmark;
			kind: "scripture";
	  }
	| {
			identity: Extract<SavedItemRemoval, { kind: "community" }>;
			item: SavedCommunityPost;
			kind: "community";
	  };

export type SavedLibraryHighlight = {
	identity: Extract<SavedItemRemoval, { kind: "highlight" }>;
	item: SavedHighlight;
	kind: "highlight";
};

export type SavedLibrary = {
	bookmarks: SavedLibraryBookmark[];
	highlights: SavedLibraryHighlight[];
};

/** Returns the authenticated member's saved Scripture, highlights, and Community posts. */
export async function listSavedItems(
	db: DbClient,
	userId: string,
): Promise<SavedLibrary> {
	const [savedItems, communityBookmarks] = await Promise.all([
		listSavedScriptureItems(db, userId),
		listSavedCommunityPosts(db, userId),
	]);

	return createSavedLibrary(savedItems, communityBookmarks);
}

/** Removes one saved item owned by the current member. */
export async function removeSavedItem(
	db: DbClient,
	userId: string,
	item: SavedItemRemoval,
): Promise<boolean> {
	switch (item.kind) {
		case "scripture":
			return removeSavedBookmark(db, userId, item.passageId);
		case "highlight":
			return removeSavedHighlight(db, userId, item.highlightId);
		case "community":
			return setCommunityPostBookmark(db, userId, item.postId, false);
	}
}

/** Combines saved material into the Saved library's display groups. */
export function createSavedLibrary(
	savedItems: SavedItems,
	communityBookmarks: readonly SavedCommunityPost[],
): SavedLibrary {
	return {
		bookmarks: [
			...savedItems.bookmarks.map(toSavedScriptureBookmark),
			...communityBookmarks.map(toSavedCommunityBookmark),
		],
		highlights: savedItems.highlights.map(toSavedHighlight),
	};
}

async function listSavedScriptureItems(
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

/** Removes the current member's bookmark for one Scripture passage. */
async function removeSavedBookmark(
	db: DbClient,
	userId: string,
	passageId: number,
): Promise<boolean> {
	const removed = await db
		.delete(bookmarks)
		.where(
			and(eq(bookmarks.userId, userId), eq(bookmarks.passageId, passageId)),
		)
		.returning({ passageId: bookmarks.passageId });

	return removed.length > 0;
}

/** Removes one of the current member's saved highlights. */
async function removeSavedHighlight(
	db: DbClient,
	userId: string,
	highlightId: number,
): Promise<boolean> {
	const removed = await db
		.delete(highlights)
		.where(and(eq(highlights.userId, userId), eq(highlights.id, highlightId)))
		.returning({ id: highlights.id });

	return removed.length > 0;
}

function toSavedScriptureBookmark(
	item: SavedBookmark,
): Extract<SavedLibraryBookmark, { kind: "scripture" }> {
	return {
		identity: { kind: "scripture", passageId: item.passageId },
		item,
		kind: "scripture",
	};
}

function toSavedCommunityBookmark(
	item: SavedCommunityPost,
): Extract<SavedLibraryBookmark, { kind: "community" }> {
	return {
		identity: { kind: "community", postId: item.id },
		item,
		kind: "community",
	};
}

function toSavedHighlight(item: SavedHighlight): SavedLibraryHighlight {
	return {
		identity: { highlightId: item.id, kind: "highlight" },
		item,
		kind: "highlight",
	};
}
