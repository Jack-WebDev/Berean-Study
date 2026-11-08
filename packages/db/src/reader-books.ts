import { and, desc, eq } from "drizzle-orm";

import { bookOverviewSchema, parseOutlineRange } from "./book-overview";
import { commentaryBodySchema } from "./commentary-body";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import {
	chapterCountOf,
	chooseReaderTranslation,
	findBook,
	getReadingPlace,
	publishedChapterNumbers,
} from "./reader";
import { readerBookGroup } from "./reader-catalogue";
import {
	citationSources,
	numberWritings,
	type StudySource,
	type StudyWriting,
	sourcesFor,
} from "./reader-study";
import { contentItems } from "./schema/content_items";
import { contentRevisions } from "./schema/content_revisions";
import { readingHistory } from "./schema/reading_history";
import { resolvePassage } from "./scripture-reference";
import { publishedPassageText } from "./study-content";

/*
 * What Browse, Choose a chapter and About this book need about one book (HANDOFF
 * Screens 5 and 6). About this book joins two pieces of reviewed content, the book
 * overview and the book introduction, and leaves out anything with nothing in it.
 */

/** The live wording of a book's overview or introduction, if one is published. */
async function liveBookContent(
	client: DbExecutor,
	kind: "book_introduction" | "book_overview",
	bookSlug: string,
) {
	const [row] = await client
		.select({ body: contentRevisions.body, revisionId: contentRevisions.id })
		.from(contentItems)
		.innerJoin(
			contentRevisions,
			eq(contentRevisions.id, contentItems.liveRevisionId),
		)
		.where(
			and(eq(contentItems.kind, kind), eq(contentItems.scopeKey, bookSlug)),
		);
	return row ?? null;
}

async function liveOverview(client: DbExecutor, bookSlug: string) {
	const row = await liveBookContent(client, "book_overview", bookSlug);
	const parsed = bookOverviewSchema.safeParse(row?.body);
	return parsed.success ? parsed.data : null;
}

async function liveIntroduction(client: DbExecutor, bookSlug: string) {
	const row = await liveBookContent(client, "book_introduction", bookSlug);
	const parsed = commentaryBodySchema.safeParse(row?.body);
	if (!row || !parsed.success || parsed.data.sections.length === 0) return null;
	return { body: parsed.data, revisionId: row.revisionId };
}

export type BookPage = {
	/** About this book has something to show. */
	hasAbout: boolean;
	/** Chapters with text in the reader's translation. Others are still listed. */
	availableChapters: number[];
	book: {
		/** The heading it sits under on Browse, such as "Gospels". */
		group: string;
		name: string;
		slug: string;
		testament: "old" | "new";
	};
	chapterCount: number;
	/** The chapter of this book the member read most recently, if any. */
	lastRead: number | null;
	/** One sentence from the book overview. */
	summary: string | null;
};

/** Choose a chapter (Screen 5). Null when there's no such book. */
export async function getBookPage(
	client: DbExecutor,
	userId: string,
	input: {
		bookSlug: string;
		traditionSlug: string | null;
		translationAbbreviations: Array<string | null | undefined>;
	},
): Promise<BookPage | null> {
	const book = await findBook(client, input.bookSlug);
	if (!book) return null;
	const translation = await chooseReaderTranslation(
		client,
		input.translationAbbreviations,
	);
	const [chapterCount, availableChapters, overview, introduction, place] =
		await Promise.all([
			chapterCountOf(client, book, input.traditionSlug),
			translation
				? publishedChapterNumbers(client, book.id, translation.id)
				: Promise.resolve([]),
			liveOverview(client, book.slug),
			liveIntroduction(client, book.slug),
			getReadingPlace(client, userId),
		]);

	let lastRead = place?.book.slug === book.slug ? place.chapter : null;
	if (lastRead === null) {
		const [latest] = await client
			.select({ chapter: readingHistory.chapter })
			.from(readingHistory)
			.where(
				and(
					eq(readingHistory.userId, userId),
					eq(readingHistory.bookId, book.id),
				),
			)
			.orderBy(desc(readingHistory.visitedAt), desc(readingHistory.id))
			.limit(1);
		lastRead = latest?.chapter ?? null;
	}

	return {
		availableChapters,
		book: {
			group: readerBookGroup(book.group, book.testament),
			name: book.name,
			slug: book.slug,
			testament: book.testament,
		},
		// Every book has a King James count, so this is never empty.
		chapterCount: chapterCount ?? Math.max(1, ...availableChapters),
		hasAbout:
			Boolean(overview && hasOverviewContent(overview)) ||
			introduction !== null,
		lastRead,
		summary: overview?.summary || null,
	};
}

function hasOverviewContent(
	overview: NonNullable<Awaited<ReturnType<typeof liveOverview>>>,
) {
	return Boolean(
		overview.summary ||
			overview.author ||
			overview.approximateDate ||
			overview.writtenFrom ||
			overview.firstReaders ||
			overview.keyVerse ||
			overview.keyThemes.length > 0 ||
			overview.outline.length > 0,
	);
}

/** Where a reference in the outline or a key verse opens on the reading page. */
export type ReaderPlace = { chapter: number; verse: number | null };

export type AboutBook = {
	book: { name: string; slug: string };
	/** Written by, When, Written from, First readers: only the ones filled in. */
	details: Array<{ label: string; value: string }>;
	introduction: {
		sections: Array<{ key: string; title: string; writing: StudyWriting }>;
		sources: StudySource[];
		title: string;
	} | null;
	keyVerse: {
		label: string;
		place: ReaderPlace | null;
		/** The words in the reader's translation, if they've been published. */
		text: string | null;
		translationAbbreviation: string | null;
	} | null;
	outline: Array<{ heading: string; place: ReaderPlace | null; range: string }>;
	summary: string | null;
	themes: string[];
};

/**
 * About this book (Screen 6): the overview and the introduction as one page.
 * Null when there's no such book; every part is empty when nothing is published.
 */
export async function getAboutBook(
	client: DbExecutor,
	input: {
		bookSlug: string;
		translationAbbreviations: Array<string | null | undefined>;
	},
): Promise<AboutBook | null> {
	const book = await findBook(client, input.bookSlug);
	if (!book) return null;
	const [overview, introduction, translation] = await Promise.all([
		liveOverview(client, book.slug),
		liveIntroduction(client, book.slug),
		chooseReaderTranslation(client, input.translationAbbreviations),
	]);

	const details = overview
		? [
				{ label: "Written by", value: overview.author },
				{ label: "When", value: overview.approximateDate },
				{ label: "Written from", value: overview.writtenFrom },
				{ label: "First readers", value: overview.firstReaders },
			].filter((detail) => detail.value)
		: [];

	let keyVerse: AboutBook["keyVerse"] = null;
	if (overview?.keyVerse) {
		const resolved = await resolveKeyVerse(
			client,
			overview.keyVerse,
			book.name,
		);
		keyVerse = {
			label: resolved?.label ?? overview.keyVerse,
			place: resolved
				? {
						chapter: resolved.passage.from.chapter,
						verse: resolved.passage.from.verse,
					}
				: null,
			text:
				resolved && translation && resolved.bookSlug === book.slug
					? await publishedPassageText(
							client,
							resolved.passage,
							translation.abbreviation,
						)
					: null,
			translationAbbreviation: translation?.abbreviation ?? null,
		};
	}

	let introductionPart: AboutBook["introduction"] = null;
	if (introduction) {
		const { body, revisionId } = introduction;
		const documents = body.sections.map((section) => section.body);
		const writings = numberWritings(documents);
		const { bodies, byRevision } = await citationSources(client, [revisionId]);
		introductionPart = {
			sections: body.sections.map((section, index) => ({
				key: section.key,
				title: section.title,
				writing: writings[index] as StudyWriting,
			})),
			sources: sourcesFor(documents, byRevision.get(revisionId) ?? [], bodies),
			title: body.title,
		};
	}

	return {
		book: { name: book.name, slug: book.slug },
		details,
		introduction: introductionPart,
		keyVerse,
		outline: (overview?.outline ?? [])
			.filter((part) => part.heading)
			.map((part) => {
				const range = parseOutlineRange(part.range);
				return {
					heading: part.heading,
					place: range
						? { chapter: range.from.chapter, verse: range.from.verse ?? null }
						: null,
					range: part.range,
				};
			}),
		summary: overview?.summary || null,
		themes: overview?.keyThemes ?? [],
	};
}

/** A key verse may be written in full ("John 20:31") or as numbers only ("20:31"). */
async function resolveKeyVerse(
	client: DbExecutor,
	text: string,
	bookName: string,
) {
	for (const attempt of [text, `${bookName} ${text}`]) {
		try {
			const resolved = await resolvePassage(client, attempt);
			return { ...resolved, bookSlug: resolved.passage.bookSlug };
		} catch (error) {
			if (!(error instanceof GovernanceError)) throw error;
		}
	}
	return null;
}

/** How many words of the verse the Continue reading card shows. */
const continueReadingWords = 14;

export type ContinueReading = {
	label: string;
	place: { bookSlug: string; chapter: number; verse: number };
	/** The first words of the verse, ending in "…" if cut short. */
	start: string | null;
	translationName: string | null;
};

/** The Continue reading card on Browse. Null before the member has read anything. */
export async function getContinueReading(
	client: DbExecutor,
	userId: string,
	translationAbbreviations: Array<string | null | undefined>,
): Promise<ContinueReading | null> {
	const place = await getReadingPlace(client, userId);
	if (!place) return null;
	const translation = await chooseReaderTranslation(client, [
		place.translationAbbreviation,
		...translationAbbreviations,
	]);
	const point = { chapter: place.chapter, verse: place.verse };
	const text = translation
		? await publishedPassageText(
				client,
				{ bookSlug: place.book.slug, from: point, to: point },
				translation.abbreviation,
			)
		: null;
	const words = text?.replace(/\s+/g, " ").trim().split(" ") ?? [];
	return {
		label: place.label,
		place: {
			bookSlug: place.book.slug,
			chapter: place.chapter,
			verse: place.verse,
		},
		start:
			words.length === 0
				? null
				: words.length > continueReadingWords
					? `${words.slice(0, continueReadingWords).join(" ")}…`
					: words.join(" "),
		translationName: translation?.name ?? null,
	};
}
