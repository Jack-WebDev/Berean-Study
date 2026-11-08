import { and, asc, desc, eq, gte, inArray, lte, max, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import {
	type BrowseTestament,
	chapterLabel,
	defaultReadingPreferences,
	type LineLength,
	type MissingVerseNote,
	missingVerseNote,
	type PageColour,
	type ReadingPreferences,
	type ReadingTextSize,
	readerBookGroup,
	type StudyGroupKey,
	selectionLabel,
	studyContentKinds,
	studyGroupOfKind,
	studyGroups,
	type VerseLayout,
	verseRuns,
} from "./reader-catalogue";
import { bookmarks } from "./schema/bookmarks";
import { books } from "./schema/books";
import { canonBooks } from "./schema/canon_books";
import { canonTraditions } from "./schema/canon_traditions";
import { chapters } from "./schema/chapters";
import { contentItems } from "./schema/content_items";
import { contentPassages } from "./schema/content_passages";
import { contentRevisions } from "./schema/content_revisions";
import { highlights } from "./schema/highlights";
import { notePassages } from "./schema/note_passages";
import { notes } from "./schema/notes";
import { passageRanges } from "./schema/passage_ranges";
import { passages } from "./schema/passages";
import { readingHistory } from "./schema/reading_history";
import { readingPositions } from "./schema/reading_positions";
import { translations } from "./schema/translations";
import { userPreferences } from "./schema/user_preferences";
import { versePresence } from "./schema/verse_presence";
import { verseTexts } from "./schema/verse_texts";
import { verses } from "./schema/verses";
import { protestantCanonSlug } from "./scripture-catalogue";
import { listSupportedTranslations } from "./translations-admin";
import { currentPublishingBlock } from "./verse-text-rows";

/*
 * Everything the Bible reader reads and saves: chapters of published text, book
 * lists, the member's settings and place, highlights, and the small marks beside
 * verses. Readers only ever see published text and live study content.
 */

// ---------------------------------------------------------------------------
// Settings

export async function getReadingPreferences(
	client: DbExecutor,
	userId: string,
): Promise<ReadingPreferences> {
	const [row] = await client
		.select({
			browseTestament: userPreferences.browseTestament,
			lineLength: userPreferences.lineLength,
			pageColour: userPreferences.pageColour,
			readerHintSeenAt: userPreferences.readerHintSeenAt,
			showSectionHeadings: userPreferences.showSectionHeadings,
			showVerseNumbers: userPreferences.showVerseNumbers,
			textSize: userPreferences.readingTextSize,
			traditionSlug: canonTraditions.slug,
			translationAbbreviation: translations.abbreviation,
			verseLayout: userPreferences.verseLayout,
			welcomeCompletedAt: userPreferences.welcomeCompletedAt,
		})
		.from(userPreferences)
		.leftJoin(
			canonTraditions,
			eq(canonTraditions.id, userPreferences.preferredCanonTraditionId),
		)
		.leftJoin(
			translations,
			eq(translations.id, userPreferences.preferredTranslationId),
		)
		.where(eq(userPreferences.userId, userId));
	if (!row) return defaultReadingPreferences;

	const { readerHintSeenAt, welcomeCompletedAt, ...settings } = row;
	return {
		...settings,
		readerHintSeen: readerHintSeenAt !== null,
		welcomeCompleted: welcomeCompletedAt !== null,
	};
}

export type ReadingPreferenceChanges = Partial<{
	browseTestament: BrowseTestament;
	lineLength: LineLength;
	pageColour: PageColour;
	readerHintSeen: true;
	showSectionHeadings: boolean;
	showVerseNumbers: boolean;
	textSize: ReadingTextSize;
	traditionSlug: string;
	translationAbbreviation: string;
	verseLayout: VerseLayout;
	welcomeCompleted: true;
}>;

/** Saves only what changed. A member without a settings row gets one. */
export async function saveReadingPreferences(
	client: DbExecutor,
	userId: string,
	changes: ReadingPreferenceChanges,
): Promise<ReadingPreferences> {
	const {
		readerHintSeen,
		textSize,
		traditionSlug,
		translationAbbreviation,
		welcomeCompleted,
		...direct
	} = changes;
	const values: Partial<typeof userPreferences.$inferInsert> = { ...direct };
	if (textSize) values.readingTextSize = textSize;
	if (readerHintSeen) values.readerHintSeenAt = new Date();
	if (welcomeCompleted) values.welcomeCompletedAt = new Date();
	if (traditionSlug) {
		const [tradition] = await client
			.select({ id: canonTraditions.id })
			.from(canonTraditions)
			.where(eq(canonTraditions.slug, traditionSlug));
		if (!tradition) throw new GovernanceError("We can't find that book list.");
		values.preferredCanonTraditionId = tradition.id;
	}
	if (translationAbbreviation) {
		const translation = await findAvailableTranslation(
			client,
			translationAbbreviation,
		);
		if (!translation) {
			throw new GovernanceError("That translation isn't available yet.");
		}
		values.preferredTranslationId = translation.id;
	}

	if (Object.keys(values).length > 0) {
		await client
			.insert(userPreferences)
			.values({ ...values, userId })
			.onConflictDoUpdate({ set: values, target: userPreferences.userId });
	}
	return getReadingPreferences(client, userId);
}

// ---------------------------------------------------------------------------
// Translations

export type ReaderTranslation = {
	abbreviation: string;
	/** Has published text, and we're allowed to show it today. */
	available: boolean;
	copyrightNotice: string | null;
	id: number;
	name: string;
};

/** All six translations in the usual order, whether or not readers can use them yet. */
export async function listReaderTranslations(
	client: DbExecutor,
): Promise<ReaderTranslation[]> {
	const supported = await listSupportedTranslations(client);
	return Promise.all(
		supported.map(async (translation) => {
			const [published] = await client
				.select({ verseId: verseTexts.verseId })
				.from(verseTexts)
				.where(eq(verseTexts.translationId, translation.id))
				.limit(1);
			return {
				abbreviation: translation.abbreviation,
				available:
					published !== undefined &&
					currentPublishingBlock(translation) === null,
				copyrightNotice: translation.copyrightNotice,
				id: translation.id,
				name: translation.name,
			};
		}),
	);
}

async function findAvailableTranslation(
	client: DbExecutor,
	abbreviation: string,
) {
	return (await listReaderTranslations(client)).find(
		(translation) =>
			translation.available &&
			translation.abbreviation.toLowerCase() === abbreviation.toLowerCase(),
	);
}

/**
 * The translation to read in: the one asked for if readers can use it, then the
 * member's preferred one, then the first available. Null if none are available.
 */
export async function chooseReaderTranslation(
	client: DbExecutor,
	wanted: Array<string | null | undefined>,
) {
	const available = (await listReaderTranslations(client)).filter(
		(translation) => translation.available,
	);
	for (const abbreviation of wanted) {
		const match =
			abbreviation &&
			available.find(
				(translation) =>
					translation.abbreviation.toLowerCase() === abbreviation.toLowerCase(),
			);
		if (match) return match;
	}
	return available[0] ?? null;
}

// ---------------------------------------------------------------------------
// Books

async function findBook(client: DbExecutor, slug: string) {
	const [book] = await client
		.select({
			expectedChapters: books.expectedChapters,
			group: books.bookGroup,
			id: books.id,
			name: books.name,
			slug: books.slug,
			testament: books.testament,
		})
		.from(books)
		.where(eq(books.slug, slug));
	return book ?? null;
}

/**
 * The tradition whose book list to show. One with no books entered yet, such as
 * Ethiopian Orthodox today, falls back to the Protestant list.
 */
async function chooseTradition(client: DbExecutor, slug: string | null) {
	const rows = await client
		.select({
			bookCount: sql<number>`count(${canonBooks.bookId})::int`,
			id: canonTraditions.id,
			name: canonTraditions.name,
			slug: canonTraditions.slug,
		})
		.from(canonTraditions)
		.leftJoin(canonBooks, eq(canonBooks.canonId, canonTraditions.id))
		.groupBy(canonTraditions.id);
	const protestant = rows.find((row) => row.slug === protestantCanonSlug);
	if (!protestant) throw new Error("The Protestant book list is missing.");
	const chosen = rows.find((row) => row.slug === slug) ?? protestant;
	return {
		chosen: { name: chosen.name, slug: chosen.slug },
		listed: chosen.bookCount > 0 ? chosen : protestant,
	};
}

export type CanonBook = {
	chapterCount: number | null;
	group: string;
	name: string;
	/** Some Christian traditions don't include this book. */
	notInEveryTradition: boolean;
	slug: string;
	testament: "old" | "new";
};

/**
 * The books of one tradition's Bible, in its order, for Browse. A chapter count
 * still waiting for approval falls back to the King James count.
 */
export async function listCanonBooks(
	client: DbExecutor,
	traditionSlug: string | null,
) {
	const { chosen, listed } = await chooseTradition(client, traditionSlug);
	const rows = await client
		.select({
			chapterLimit: canonBooks.chapterLimit,
			expectedChapters: books.expectedChapters,
			group: books.bookGroup,
			id: books.id,
			name: books.name,
			slug: books.slug,
			testament: books.testament,
		})
		.from(canonBooks)
		.innerJoin(books, eq(books.id, canonBooks.bookId))
		.where(eq(canonBooks.canonId, listed.id))
		.orderBy(asc(canonBooks.canonicalOrder));

	// A book is in every tradition when every list that has been entered includes it.
	const listsByBook = await client
		.select({
			bookId: canonBooks.bookId,
			lists: sql<number>`count(*)::int`,
		})
		.from(canonBooks)
		.groupBy(canonBooks.bookId);
	const [enteredLists] = await client
		.select({
			value: sql<number>`count(distinct ${canonBooks.canonId})::int`,
		})
		.from(canonBooks);
	const listCount = new Map(listsByBook.map((row) => [row.bookId, row.lists]));

	const bookList: CanonBook[] = rows.map((row) => ({
		chapterCount: row.chapterLimit ?? row.expectedChapters,
		group: readerBookGroup(row.group, row.testament),
		name: row.name,
		notInEveryTradition:
			(listCount.get(row.id) ?? 0) < (enteredLists?.value ?? 0),
		slug: row.slug,
		testament: row.testament,
	}));
	return {
		books: bookList,
		/** The tradition the member chose. */
		tradition: chosen,
		/** True when that tradition's list isn't entered yet, so the Protestant one is shown. */
		usingFallbackList: listed.slug !== chosen.slug,
	};
}

/** How many chapters a book has for this reader. */
async function chapterCountOf(
	client: DbExecutor,
	book: { expectedChapters: number | null; id: number },
	traditionSlug: string | null,
) {
	const { listed } = await chooseTradition(client, traditionSlug);
	const [inList] = await client
		.select({ limit: canonBooks.chapterLimit })
		.from(canonBooks)
		.where(
			and(eq(canonBooks.canonId, listed.id), eq(canonBooks.bookId, book.id)),
		);
	if (inList?.limit) return inList.limit;
	// Not in this tradition's list, or not approved yet: the most any list allows.
	const [highest] = await client
		.select({ value: max(canonBooks.chapterLimit) })
		.from(canonBooks)
		.where(eq(canonBooks.bookId, book.id));
	return highest?.value ?? book.expectedChapters;
}

/** The chapter numbers of a book that have published text in this translation. */
async function publishedChapterNumbers(
	client: DbExecutor,
	bookId: number,
	translationId: number,
) {
	const rows = await client
		.selectDistinct({ number: chapters.number })
		.from(verseTexts)
		.innerJoin(verses, eq(verses.id, verseTexts.verseId))
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.where(
			and(
				eq(verseTexts.translationId, translationId),
				eq(chapters.bookId, bookId),
			),
		)
		.orderBy(asc(chapters.number));
	return rows.map((row) => row.number);
}

export async function listAvailableChapters(
	client: DbExecutor,
	input: { bookSlug: string; translationAbbreviation: string },
) {
	const book = await findBook(client, input.bookSlug);
	const translation = await findAvailableTranslation(
		client,
		input.translationAbbreviation,
	);
	if (!book || !translation) return [];
	return publishedChapterNumbers(client, book.id, translation.id);
}

// ---------------------------------------------------------------------------
// Chapters

export type ReaderVerse = {
	number: number;
	text: string;
};

type ChapterBase = {
	book: { name: string; slug: string; testament: "old" | "new" };
	chapter: number;
	chapterCount: number;
	label: string;
	next: number | null;
	previous: number | null;
	translation: ReaderTranslation;
};

export type ReaderChapter =
	| (ChapterBase & {
			missingVerses: MissingVerseNote[];
			status: "available";
			verses: ReaderVerse[];
	  })
	| (ChapterBase & {
			/** The closest chapter readers can open instead, if any. */
			nearestAvailable: number | null;
			status: "not_available";
	  });

/**
 * One chapter of published text in one translation. A chapter that hasn't been
 * published comes back as "not available" so the page can say so kindly. Returns
 * null when the book or chapter number can't exist, or no translation is ready.
 */
export async function getReaderChapter(
	client: DbExecutor,
	input: {
		bookSlug: string;
		chapter: number;
		traditionSlug: string | null;
		translationAbbreviations: Array<string | null | undefined>;
	},
): Promise<ReaderChapter | null> {
	const book = await findBook(client, input.bookSlug);
	if (!book) return null;
	const translation = await chooseReaderTranslation(
		client,
		input.translationAbbreviations,
	);
	if (!translation) return null;
	const chapterCount = await chapterCountOf(client, book, input.traditionSlug);
	if (!chapterCount || input.chapter < 1 || input.chapter > chapterCount) {
		return null;
	}

	const base: ChapterBase = {
		book: { name: book.name, slug: book.slug, testament: book.testament },
		chapter: input.chapter,
		chapterCount,
		label: chapterLabel(book.name, input.chapter),
		next: input.chapter < chapterCount ? input.chapter + 1 : null,
		previous: input.chapter > 1 ? input.chapter - 1 : null,
		translation,
	};

	const [versification] = await client
		.select({ id: translations.versificationSystemId })
		.from(translations)
		.where(eq(translations.id, translation.id));
	const chapterVerses = await client
		.select({ number: verses.number, text: verseTexts.text })
		.from(verseTexts)
		.innerJoin(verses, eq(verses.id, verseTexts.verseId))
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.where(
			and(
				eq(verseTexts.translationId, translation.id),
				eq(chapters.bookId, book.id),
				eq(chapters.number, input.chapter),
				eq(chapters.versificationSystemId, versification?.id ?? -1),
			),
		)
		.orderBy(asc(verses.number));

	if (chapterVerses.length === 0) {
		const published = await publishedChapterNumbers(
			client,
			book.id,
			translation.id,
		);
		const nearest = [...published].sort(
			(a, b) =>
				Math.abs(a - input.chapter) - Math.abs(b - input.chapter) || a - b,
		)[0];
		return {
			...base,
			nearestAvailable: nearest ?? null,
			status: "not_available",
		};
	}

	const includedIn = alias(verses, "included_in");
	const presence = await client
		.select({
			includedInVerse: includedIn.number,
			kind: versePresence.kind,
			verse: verses.number,
		})
		.from(versePresence)
		.innerJoin(verses, eq(verses.id, versePresence.verseId))
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.leftJoin(includedIn, eq(includedIn.id, versePresence.includedInVerseId))
		.where(
			and(
				eq(versePresence.translationId, translation.id),
				eq(chapters.bookId, book.id),
				eq(chapters.number, input.chapter),
				eq(chapters.versificationSystemId, versification?.id ?? -1),
			),
		)
		.orderBy(asc(verses.number));

	return {
		...base,
		missingVerses: presence.flatMap((row) => {
			const note = missingVerseNote({
				includedInVerse: row.includedInVerse,
				kind: row.kind,
				translationName: translation.name,
				verse: row.verse,
			});
			return note ? [note] : [];
		}),
		status: "available",
		verses: chapterVerses,
	};
}

/** The verse rows of one chapter, by number, in a translation's numbering. */
async function chapterVerseRows(
	client: DbExecutor,
	input: { bookSlug: string; chapter: number; translationAbbreviation: string },
) {
	const book = await findBook(client, input.bookSlug);
	const translation = await findAvailableTranslation(
		client,
		input.translationAbbreviation,
	);
	if (!book || !translation) {
		throw new GovernanceError("This chapter isn't available.");
	}
	const rows = await client
		.select({
			number: verses.number,
			text: verseTexts.text,
			verseId: verses.id,
			versificationSystemId: chapters.versificationSystemId,
		})
		.from(verseTexts)
		.innerJoin(verses, eq(verses.id, verseTexts.verseId))
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.innerJoin(
			translations,
			and(
				eq(translations.id, verseTexts.translationId),
				eq(translations.versificationSystemId, chapters.versificationSystemId),
			),
		)
		.where(
			and(
				eq(verseTexts.translationId, translation.id),
				eq(chapters.bookId, book.id),
				eq(chapters.number, input.chapter),
			),
		);
	return { book, rows, translation };
}

/** Looks up chosen verses, refusing any that have no published text. */
async function chosenVerses(
	client: DbExecutor,
	input: {
		bookSlug: string;
		chapter: number;
		translationAbbreviation: string;
		verses: readonly number[];
	},
) {
	if (input.verses.length === 0) throw new GovernanceError("Choose a verse.");
	const { book, rows, translation } = await chapterVerseRows(client, input);
	const byNumber = new Map(rows.map((row) => [row.number, row]));
	const chosen = [...new Set(input.verses)].map((number) => {
		const row = byNumber.get(number);
		if (!row) throw new GovernanceError("One of these verses isn't available.");
		return row;
	});
	return { book, byNumber, chosen, translation };
}

// ---------------------------------------------------------------------------
// Marks beside verses

/** The verse numbers a chapter has, in order, whether or not they have text yet. */
async function chapterVerseNumbers(
	client: DbExecutor,
	bookId: number,
	chapter: number,
) {
	const rows = await client
		.selectDistinct({ number: verses.number })
		.from(verses)
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.where(and(eq(chapters.bookId, bookId), eq(chapters.number, chapter)))
		.orderBy(asc(verses.number));
	return rows.map((row) => row.number);
}

/** The chapter's verses that a stored range covers. */
function versesCovered(
	chapter: number,
	range: {
		fromChapter: number;
		fromVerse: number;
		toChapter: number;
		toVerse: number;
	},
	verseNumbers: readonly number[],
) {
	return verseNumbers.filter(
		(verse) =>
			(range.fromChapter < chapter || verse >= range.fromVerse) &&
			(range.toChapter > chapter || verse <= range.toVerse),
	);
}

export type StudyMarker = {
	/** The study panel groups this verse has, in panel order. */
	groups: StudyGroupKey[];
	verse: number;
};

/** Which verses of a chapter have live study content, for the small dots. */
export async function listStudyMarkers(
	client: DbExecutor,
	input: { bookSlug: string; chapter: number },
): Promise<StudyMarker[]> {
	const book = await findBook(client, input.bookSlug);
	if (!book) return [];
	const rows = await client
		.select({
			fromChapter: contentPassages.fromChapter,
			fromVerse: contentPassages.fromVerse,
			kind: contentItems.kind,
			toChapter: contentPassages.toChapter,
			toVerse: contentPassages.toVerse,
		})
		.from(contentPassages)
		.innerJoin(
			contentRevisions,
			eq(contentRevisions.id, contentPassages.contentRevisionId),
		)
		.innerJoin(
			contentItems,
			and(
				eq(contentItems.id, contentRevisions.contentItemId),
				eq(contentItems.liveRevisionId, contentRevisions.id),
			),
		)
		.where(
			and(
				eq(contentPassages.bookId, book.id),
				eq(contentPassages.showsToReaders, true),
				lte(contentPassages.fromChapter, input.chapter),
				gte(contentPassages.toChapter, input.chapter),
				inArray(contentItems.kind, [...studyContentKinds]),
			),
		);
	if (rows.length === 0) return [];

	const verseNumbers = await chapterVerseNumbers(
		client,
		book.id,
		input.chapter,
	);
	const groupsByVerse = new Map<number, Set<StudyGroupKey>>();
	for (const row of rows) {
		const group = studyGroupOfKind(row.kind);
		if (!group) continue;
		for (const verse of versesCovered(input.chapter, row, verseNumbers)) {
			const groups = groupsByVerse.get(verse) ?? new Set();
			groups.add(group);
			groupsByVerse.set(verse, groups);
		}
	}
	return [...groupsByVerse]
		.sort(([a], [b]) => a - b)
		.map(([verse, groups]) => ({
			groups: studyGroups
				.map((group) => group.key)
				.filter((key) => groups.has(key)),
			verse,
		}));
}

/** The verses of a chapter the member has written a note on, for the pencil marks. */
export async function listNoteMarkers(
	client: DbExecutor,
	userId: string,
	input: { bookSlug: string; chapter: number },
): Promise<number[]> {
	const book = await findBook(client, input.bookSlug);
	if (!book) return [];
	const startVerse = alias(verses, "start_verse");
	const endVerse = alias(verses, "end_verse");
	const startChapter = alias(chapters, "start_chapter");
	const endChapter = alias(chapters, "end_chapter");
	const rows = await client
		.selectDistinct({
			fromChapter: startChapter.number,
			fromVerse: startVerse.number,
			toChapter: endChapter.number,
			toVerse: endVerse.number,
		})
		.from(notes)
		.innerJoin(notePassages, eq(notePassages.noteId, notes.id))
		.innerJoin(
			passageRanges,
			eq(passageRanges.passageId, notePassages.passageId),
		)
		.innerJoin(startVerse, eq(startVerse.id, passageRanges.startVerseId))
		.innerJoin(endVerse, eq(endVerse.id, passageRanges.endVerseId))
		.innerJoin(startChapter, eq(startChapter.id, startVerse.chapterId))
		.innerJoin(endChapter, eq(endChapter.id, endVerse.chapterId))
		.where(
			and(
				eq(notes.userId, userId),
				eq(startChapter.bookId, book.id),
				lte(startChapter.number, input.chapter),
				gte(endChapter.number, input.chapter),
			),
		);
	if (rows.length === 0) return [];
	const verseNumbers = await chapterVerseNumbers(
		client,
		book.id,
		input.chapter,
	);
	const marked = new Set<number>();
	for (const row of rows) {
		for (const verse of versesCovered(input.chapter, row, verseNumbers)) {
			marked.add(verse);
		}
	}
	return [...marked].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Highlights

/** The verses of a chapter the member has highlighted, in one translation. */
export async function listHighlightedVerses(
	client: DbExecutor,
	userId: string,
	input: { bookSlug: string; chapter: number; translationAbbreviation: string },
): Promise<number[]> {
	const { rows, translation } = await chapterVerseRows(client, input);
	if (rows.length === 0) return [];
	const highlighted = await client
		.selectDistinct({ verseId: highlights.verseId })
		.from(highlights)
		.where(
			and(
				eq(highlights.userId, userId),
				eq(highlights.translationId, translation.id),
				inArray(
					highlights.verseId,
					rows.map((row) => row.verseId),
				),
			),
		);
	const ids = new Set(highlighted.map((row) => row.verseId));
	return rows
		.filter((row) => ids.has(row.verseId))
		.map((row) => row.number)
		.sort((a, b) => a - b);
}

type HighlightRange = {
	endOffset: number;
	startOffset: number;
	translationId: number;
	verseId: number;
};

/**
 * What Undo needs to put highlights back as they were: either the highlights just
 * added, to take away, or the ones just removed, to restore exactly.
 */
export type HighlightUndo =
	| { remove: number[] }
	| { restore: HighlightRange[] };

/**
 * Highlights whole verses, or removes every highlight on them. Verses already
 * highlighted (even partly) are left as they are when highlighting.
 */
export async function setVersesHighlighted(
	client: DbExecutor,
	userId: string,
	input: {
		bookSlug: string;
		chapter: number;
		highlighted: boolean;
		translationAbbreviation: string;
		verses: readonly number[];
	},
): Promise<{ label: string; undo: HighlightUndo }> {
	const { book, chosen, translation } = await chosenVerses(client, input);
	const label = selectionLabel(
		book.name,
		input.chapter,
		chosen.map((row) => row.number),
	);
	const verseIds = chosen.map((row) => row.verseId);

	if (!input.highlighted) {
		const removed = await client
			.delete(highlights)
			.where(
				and(
					eq(highlights.userId, userId),
					eq(highlights.translationId, translation.id),
					inArray(highlights.verseId, verseIds),
				),
			)
			.returning({
				endOffset: highlights.endOffset,
				startOffset: highlights.startOffset,
				translationId: highlights.translationId,
				verseId: highlights.verseId,
			});
		return { label, undo: { restore: removed } };
	}

	const existing = await client
		.selectDistinct({ verseId: highlights.verseId })
		.from(highlights)
		.where(
			and(
				eq(highlights.userId, userId),
				eq(highlights.translationId, translation.id),
				inArray(highlights.verseId, verseIds),
			),
		);
	const alreadyHighlighted = new Set(existing.map((row) => row.verseId));
	const toAdd = chosen.filter((row) => !alreadyHighlighted.has(row.verseId));
	const added =
		toAdd.length === 0
			? []
			: await client
					.insert(highlights)
					.values(
						toAdd.map((row) => ({
							endOffset: row.text.length,
							startOffset: 0,
							translationId: translation.id,
							userId,
							verseId: row.verseId,
						})),
					)
					.returning({ id: highlights.id });
	return { label, undo: { remove: added.map((row) => row.id) } };
}

/** Reverses a highlight change. Only ever touches this member's own highlights. */
export async function undoHighlightChange(
	client: DbExecutor,
	userId: string,
	undo: HighlightUndo,
) {
	if ("remove" in undo) {
		if (undo.remove.length === 0) return;
		await client
			.delete(highlights)
			.where(
				and(eq(highlights.userId, userId), inArray(highlights.id, undo.remove)),
			);
		return;
	}
	if (undo.restore.length === 0) return;
	// The offsets came from the browser, so they must still fit the verse's text.
	const texts = await client
		.select({
			length: sql<number>`char_length(${verseTexts.text})`,
			translationId: verseTexts.translationId,
			verseId: verseTexts.verseId,
		})
		.from(verseTexts)
		.where(
			inArray(
				verseTexts.verseId,
				undo.restore.map((range) => range.verseId),
			),
		);
	const valid = undo.restore.filter((range) => {
		const text = texts.find(
			(row) =>
				row.verseId === range.verseId &&
				row.translationId === range.translationId,
		);
		return (
			text &&
			range.startOffset >= 0 &&
			range.endOffset > range.startOffset &&
			range.endOffset <= text.length
		);
	});
	if (valid.length === 0) return;
	await client
		.insert(highlights)
		.values(valid.map((range) => ({ ...range, userId })))
		.onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// Passages for chosen verses

/**
 * Notes, Collections and Saved attach to stored passages, not to verses. This
 * finds the stored passage for each run of chosen verses, or creates one, so
 * those features work for any verse a reader taps. Verses 28–30 and 33 are two
 * runs, so two passages. Returned in verse order.
 */
export async function passagesForVerses(
	client: DbExecutor,
	input: {
		bookSlug: string;
		chapter: number;
		translationAbbreviation: string;
		verses: readonly number[];
	},
): Promise<{
	label: string;
	passages: Array<{ label: string; passageId: number }>;
}> {
	const { book, byNumber, chosen } = await chosenVerses(client, input);
	const runs = verseRuns(chosen.map((row) => row.number));
	const result: Array<{ label: string; passageId: number }> = [];
	for (const [first, last] of runs) {
		const start = byNumber.get(first);
		const end = byNumber.get(last);
		if (!start || !end)
			throw new GovernanceError("These verses can't be read.");
		const label = selectionLabel(
			book.name,
			input.chapter,
			Array.from({ length: last - first + 1 }, (_, index) => first + index),
		);
		// Ranges are stored per numbering system, and a passage has one range in each.
		const [existing] = await client
			.select({ passageId: passageRanges.passageId })
			.from(passageRanges)
			.where(
				and(
					eq(passageRanges.versificationSystemId, start.versificationSystemId),
					eq(passageRanges.startVerseId, start.verseId),
					eq(passageRanges.endVerseId, end.verseId),
				),
			)
			.orderBy(asc(passageRanges.passageId))
			.limit(1);
		if (existing) {
			result.push({ label, passageId: existing.passageId });
			continue;
		}
		const [created] = await client
			.insert(passages)
			.values({ bookId: book.id, title: label })
			.returning({ id: passages.id });
		if (!created) throw new Error("Could not save these verses.");
		await client.insert(passageRanges).values({
			endVerseId: end.verseId,
			passageId: created.id,
			startVerseId: start.verseId,
			versificationSystemId: start.versificationSystemId,
		});
		result.push({ label, passageId: created.id });
	}
	return {
		label: selectionLabel(
			book.name,
			input.chapter,
			chosen.map((row) => row.number),
		),
		passages: result,
	};
}

/**
 * Adds chosen verses to the member's Saved list. Returns only the passages that
 * weren't saved before, so Undo removes exactly what this added.
 */
export async function saveVerses(
	client: DbExecutor,
	userId: string,
	input: Parameters<typeof passagesForVerses>[1],
) {
	const { label, passages: found } = await passagesForVerses(client, input);
	const added = await client
		.insert(bookmarks)
		.values(found.map(({ passageId }) => ({ passageId, userId })))
		.onConflictDoNothing()
		.returning({ passageId: bookmarks.passageId });
	return { addedPassageIds: added.map((row) => row.passageId), label };
}

export async function unsaveVerses(
	client: DbExecutor,
	userId: string,
	passageIds: readonly number[],
) {
	if (passageIds.length === 0) return;
	await client
		.delete(bookmarks)
		.where(
			and(
				eq(bookmarks.userId, userId),
				inArray(bookmarks.passageId, [...passageIds]),
			),
		);
}

// ---------------------------------------------------------------------------
// Place and history

export type ReadingPlace = {
	book: { name: string; slug: string };
	chapter: number;
	label: string;
	translationAbbreviation: string | null;
	updatedAt: Date;
	verse: number;
};

export async function getReadingPlace(
	client: DbExecutor,
	userId: string,
): Promise<ReadingPlace | null> {
	const [row] = await client
		.select({
			bookName: books.name,
			bookSlug: books.slug,
			chapter: readingPositions.chapter,
			translationAbbreviation: translations.abbreviation,
			updatedAt: readingPositions.updatedAt,
			verse: readingPositions.verse,
		})
		.from(readingPositions)
		.innerJoin(books, eq(books.id, readingPositions.bookId))
		.leftJoin(translations, eq(translations.id, readingPositions.translationId))
		.where(eq(readingPositions.userId, userId));
	if (!row) return null;
	return {
		book: { name: row.bookName, slug: row.bookSlug },
		chapter: row.chapter,
		label: chapterLabel(row.bookName, row.chapter),
		translationAbbreviation: row.translationAbbreviation,
		updatedAt: row.updatedAt,
		verse: row.verse,
	};
}

/** Remembers where the member is. Called often while scrolling, so it's one small write. */
export async function saveReadingPlace(
	client: DbExecutor,
	userId: string,
	input: {
		bookSlug: string;
		chapter: number;
		translationAbbreviation: string | null;
		verse: number;
	},
) {
	const book = await findBook(client, input.bookSlug);
	if (!book) throw new GovernanceError("This book no longer exists.");
	if (input.chapter < 1 || input.verse < 1) {
		throw new GovernanceError("That place in the Bible doesn't exist.");
	}
	const translation = input.translationAbbreviation
		? await findAvailableTranslation(client, input.translationAbbreviation)
		: undefined;
	const values = {
		bookId: book.id,
		chapter: input.chapter,
		translationId: translation?.id ?? null,
		updatedAt: new Date(),
		verse: input.verse,
	};
	await client
		.insert(readingPositions)
		.values({ ...values, userId })
		.onConflictDoUpdate({ set: values, target: readingPositions.userId });
}

/** Reopening the same chapter within this long counts as the same visit. */
const sameVisitWindowMs = 30 * 60 * 1000;

/** Adds a chapter to the member's reading history, once per visit. */
export async function recordChapterVisit(
	client: DbExecutor,
	userId: string,
	input: { bookSlug: string; chapter: number },
) {
	const book = await findBook(client, input.bookSlug);
	if (!book) throw new GovernanceError("This book no longer exists.");
	const [latest] = await client
		.select({
			bookId: readingHistory.bookId,
			chapter: readingHistory.chapter,
			visitedAt: readingHistory.visitedAt,
		})
		.from(readingHistory)
		.where(eq(readingHistory.userId, userId))
		.orderBy(desc(readingHistory.visitedAt), desc(readingHistory.id))
		.limit(1);
	if (
		latest &&
		latest.bookId === book.id &&
		latest.chapter === input.chapter &&
		Date.now() - latest.visitedAt.getTime() < sameVisitWindowMs
	) {
		return;
	}
	await client
		.insert(readingHistory)
		.values({ bookId: book.id, chapter: input.chapter, userId });
}

/** The member's most recently read chapters, newest first, each listed once. */
export async function listRecentChapters(
	client: DbExecutor,
	userId: string,
	limit = 3,
) {
	const rows = await client
		.select({
			bookName: books.name,
			bookSlug: books.slug,
			chapter: readingHistory.chapter,
		})
		.from(readingHistory)
		.innerJoin(books, eq(books.id, readingHistory.bookId))
		.where(eq(readingHistory.userId, userId))
		.groupBy(books.id, readingHistory.chapter)
		.orderBy(desc(sql`max(${readingHistory.visitedAt})`))
		.limit(limit);
	return rows.flatMap((row) =>
		row.chapter === null
			? []
			: [
					{
						book: { name: row.bookName, slug: row.bookSlug },
						chapter: row.chapter,
						label: chapterLabel(row.bookName, row.chapter),
					},
				],
	);
}
