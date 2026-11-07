import {
	and,
	asc,
	count,
	countDistinct,
	eq,
	inArray,
	like,
	ne,
	sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { recordAudit } from "./audit";
import { highestChapterLimit } from "./canon-limits";
import {
	isCommentaryKind,
	parseCommentaryScopeKey,
	rangeContains,
} from "./commentary-body";
import { contentAtPassage } from "./content-links";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { createNotification } from "./notifications";
import { bookAliases } from "./schema/book_aliases";
import { books } from "./schema/books";
import { canonBooks } from "./schema/canon_books";
import { canonTraditions } from "./schema/canon_traditions";
import { chapters } from "./schema/chapters";
import { contentItems } from "./schema/content_items";
import { translations } from "./schema/translations";
import { versePresence } from "./schema/verse_presence";
import { verseTexts } from "./schema/verse_texts";
import { verses } from "./schema/verses";
import {
	type BookGroup,
	bookCatalogue,
	translationCatalogue,
	type VersePresenceKind,
} from "./scripture-catalogue";
import { holdersOf } from "./two-person";

const catalogueSlugs = bookCatalogue.map(({ slug }) => slug);
const catalogueAbbreviations = translationCatalogue.map(
	({ abbreviation }) => abbreviation,
);

/** The catalogue books with how much structure exists so far, in canonical order. */
export async function listScriptureBooks(client: DbExecutor) {
	const rows = await client
		.select({
			id: books.id,
			name: books.name,
			slug: books.slug,
			testament: books.testament,
			group: books.bookGroup,
			expectedChapters: books.expectedChapters,
			expectedVerses: books.expectedVerses,
			chapters: countDistinct(chapters.id),
			verses: countDistinct(verses.id),
		})
		.from(books)
		.leftJoin(chapters, eq(chapters.bookId, books.id))
		.leftJoin(verses, eq(verses.chapterId, chapters.id))
		.where(inArray(books.slug, catalogueSlugs))
		.groupBy(books.id);

	return rows.sort(
		(a, b) => catalogueSlugs.indexOf(a.slug) - catalogueSlugs.indexOf(b.slug),
	);
}

/** One book, for its Scripture Data page. Returns null when there's no such book. */
export async function getScriptureBook(client: DbExecutor, slug: string) {
	const [book] = await client.select().from(books).where(eq(books.slug, slug));
	if (!book) return null;

	const aliases = await client
		.select({ alias: bookAliases.alias })
		.from(bookAliases)
		.where(eq(bookAliases.bookId, book.id))
		.orderBy(asc(bookAliases.alias));

	const traditions = await client
		.select({ id: canonTraditions.id, name: canonTraditions.name })
		.from(canonTraditions)
		.orderBy(asc(canonTraditions.id));
	const sizes = await client
		.select({ canonId: canonBooks.canonId, value: count() })
		.from(canonBooks)
		.groupBy(canonBooks.canonId);
	const positions = await client
		.select({
			canonId: canonBooks.canonId,
			position: canonBooks.canonicalOrder,
		})
		.from(canonBooks)
		.where(eq(canonBooks.bookId, book.id));

	const [structure] = await client
		.select({
			chapters: countDistinct(chapters.id),
			verses: countDistinct(verses.id),
		})
		.from(chapters)
		.leftJoin(verses, eq(verses.chapterId, chapters.id))
		.where(eq(chapters.bookId, book.id));

	const [differing] = await client
		.select({ value: countDistinct(versePresence.verseId) })
		.from(versePresence)
		.innerJoin(verses, eq(verses.id, versePresence.verseId))
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.where(eq(chapters.bookId, book.id));

	const [withText] = await client
		.select({ value: countDistinct(verseTexts.translationId) })
		.from(verseTexts)
		.innerJoin(verses, eq(verses.id, verseTexts.verseId))
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.innerJoin(translations, eq(translations.id, verseTexts.translationId))
		.where(
			and(
				eq(chapters.bookId, book.id),
				inArray(translations.abbreviation, catalogueAbbreviations),
			),
		);

	const [introduction] = await client
		.select({
			liveRevisionId: contentItems.liveRevisionId,
			title: contentItems.title,
		})
		.from(contentItems)
		.where(
			and(
				eq(contentItems.kind, "book_introduction"),
				eq(contentItems.scopeKey, book.slug),
			),
		);

	return {
		id: book.id,
		name: book.name,
		slug: book.slug,
		shortName: book.shortName,
		testament: book.testament,
		group: book.bookGroup,
		fullTitle: book.fullTitle,
		expectedChapters: book.expectedChapters,
		expectedVerses: book.expectedVerses,
		chapterLimit: await highestChapterLimit(client, book.id),
		aliases: aliases.map((row) => row.alias),
		canons: traditions.map(({ id, name }) => ({
			name,
			position:
				positions.find(({ canonId }) => canonId === id)?.position ?? null,
			size: sizes.find(({ canonId }) => canonId === id)?.value ?? 0,
		})),
		chapters: structure?.chapters ?? 0,
		verses: structure?.verses ?? 0,
		differingVerses: differing?.value ?? 0,
		translationsWithText: withText?.value ?? 0,
		totalTranslations: translationCatalogue.length,
		introduction: introduction
			? {
					isLive: introduction.liveRevisionId !== null,
					title: introduction.title,
				}
			: null,
	};
}

export type VersePresenceRow = {
	abbreviation: string;
	kind: VersePresenceKind | "present";
	includedInVerse: number | null;
};

/**
 * Whether each translation has this verse. All six share one set of verse
 * numbers, so a verse with no recorded exception is simply present.
 */
async function presenceOfVerse(
	client: DbExecutor,
	verseId: number,
): Promise<VersePresenceRow[]> {
	const includedVerse = alias(verses, "included_verse");
	const exceptions = await client
		.select({
			abbreviation: translations.abbreviation,
			kind: versePresence.kind,
			includedInVerse: includedVerse.number,
		})
		.from(versePresence)
		.innerJoin(translations, eq(translations.id, versePresence.translationId))
		.leftJoin(
			includedVerse,
			eq(includedVerse.id, versePresence.includedInVerseId),
		)
		.where(eq(versePresence.verseId, verseId));

	return catalogueAbbreviations.map((abbreviation) => {
		const exception = exceptions.find(
			(row) => row.abbreviation === abbreviation,
		);
		return exception
			? {
					abbreviation,
					kind: exception.kind,
					includedInVerse: exception.includedInVerse,
				}
			: { abbreviation, kind: "present" as const, includedInVerse: null };
	});
}

/**
 * Commentaries covering this verse. They name their verses rather than pointing to
 * stored passages, so this reads each one on the book. Books have few enough.
 */
async function commentariesCovering(client: DbExecutor, verseId: number) {
	const [verse] = await client
		.select({
			chapter: chapters.number,
			slug: books.slug,
			verse: verses.number,
		})
		.from(verses)
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.innerJoin(books, eq(books.id, chapters.bookId))
		.where(eq(verses.id, verseId));
	if (!verse) return 0;

	const rows = await client
		.select({ kind: contentItems.kind, scopeKey: contentItems.scopeKey })
		.from(contentItems)
		.where(
			and(
				inArray(contentItems.kind, ["passage_commentary", "verse_commentary"]),
				like(contentItems.scopeKey, `${verse.slug}:%`),
			),
		);
	return rows.filter(({ kind, scopeKey }) => {
		const scope = isCommentaryKind(kind)
			? parseCommentaryScopeKey(kind, scopeKey)
			: null;
		return (
			scope &&
			scope.kind !== "book_introduction" &&
			rangeContains(scope, { chapter: verse.chapter, verse: verse.verse })
		);
	}).length;
}

/** How many pieces of content are attached to this verse. */
export async function linkedContentCounts(client: DbExecutor, verseId: number) {
	const commentary = await commentariesCovering(client, verseId);
	const [verse] = await client
		.select({
			bookId: chapters.bookId,
			chapter: chapters.number,
			verse: verses.number,
		})
		.from(verses)
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.where(eq(verses.id, verseId));
	if (!verse) return { commentary, crossReferences: 0, themes: 0 };

	const point = { chapter: verse.chapter, verse: verse.verse };
	const attached = await contentAtPassage(
		client,
		{ bookId: verse.bookId, from: point, to: point },
		{
			kinds: ["cross_reference", "canonical_relationship", "theme"],
			revision: "latest",
		},
	);
	const themes = attached.filter(({ kind }) => kind === "theme").length;
	return {
		commentary,
		crossReferences: attached.length - themes,
		themes,
	};
}

/**
 * A book's chapters, the verses of one chapter, and the details of one verse.
 * Falls back to the first chapter and verse when none is chosen, or when the
 * chosen one doesn't exist.
 */
export async function getBookStructure(
	client: DbExecutor,
	input: { slug: string; chapter?: number; verse?: number },
) {
	const [book] = await client
		.select({ id: books.id, name: books.name, slug: books.slug })
		.from(books)
		.where(eq(books.slug, input.slug));
	if (!book) return null;

	const chapterRows = await client
		.select({
			id: chapters.id,
			number: chapters.number,
			verses: countDistinct(verses.id),
			differingVerses: countDistinct(versePresence.verseId),
		})
		.from(chapters)
		.leftJoin(verses, eq(verses.chapterId, chapters.id))
		.leftJoin(versePresence, eq(versePresence.verseId, verses.id))
		.where(eq(chapters.bookId, book.id))
		.groupBy(chapters.id)
		.orderBy(asc(chapters.number));

	const chapter =
		chapterRows.find(({ number }) => number === input.chapter) ??
		chapterRows[0];
	const verseRows = chapter
		? await client
				.select({
					id: verses.id,
					number: verses.number,
					differs: sql<boolean>`count(${versePresence.verseId}) > 0`,
				})
				.from(verses)
				.leftJoin(versePresence, eq(versePresence.verseId, verses.id))
				.where(eq(verses.chapterId, chapter.id))
				.groupBy(verses.id)
				.orderBy(asc(verses.number))
		: [];
	const verse =
		verseRows.find(({ number }) => number === input.verse) ?? verseRows[0];

	return {
		book,
		chapters: chapterRows,
		chapter: chapter?.number ?? null,
		verses: verseRows,
		selectedVerse: verse
			? {
					number: verse.number,
					differs: verse.differs,
					presence: await presenceOfVerse(client, verse.id),
					linked: await linkedContentCounts(client, verse.id),
				}
			: null,
	};
}

export type BookRecordInput = {
	name: string;
	fullTitle: string;
	testament: "old" | "new";
	group: BookGroup;
	aliases: string[];
};

/** Saves a book's official details. Superadmins' edits here are never overwritten. */
export async function updateBookRecord(
	client: DbExecutor,
	input: BookRecordInput & { actorUserId: string; slug: string },
) {
	const name = input.name.trim();
	const fullTitle = input.fullTitle.trim();
	if (!name) throw new GovernanceError("Give the book a name.");
	if (!fullTitle) throw new GovernanceError("Give the book a full title.");

	const aliases = [
		...new Map(
			input.aliases
				.map((value) => value.trim())
				.filter(Boolean)
				.map((value) => [value.toLowerCase(), value]),
		).values(),
	];

	await client.transaction(async (tx) => {
		const [book] = await tx
			.select()
			.from(books)
			.where(eq(books.slug, input.slug));
		if (!book) throw new GovernanceError("This book no longer exists.");

		const [nameClash] = await tx
			.select({ id: books.id })
			.from(books)
			.where(and(eq(books.name, name), ne(books.id, book.id)));
		if (nameClash) {
			throw new GovernanceError(`Another book is already called ${name}.`);
		}

		if (aliases.length > 0) {
			const [aliasClash] = await tx
				.select({ alias: bookAliases.alias, book: books.name })
				.from(bookAliases)
				.innerJoin(books, eq(books.id, bookAliases.bookId))
				.where(
					and(
						ne(bookAliases.bookId, book.id),
						inArray(
							sql`lower(${bookAliases.alias})`,
							aliases.map((value) => value.toLowerCase()),
						),
					),
				);
			if (aliasClash) {
				throw new GovernanceError(
					`"${aliasClash.alias}" already points to ${aliasClash.book}, so it can't point here too.`,
				);
			}
		}

		await tx
			.update(books)
			.set({
				name,
				fullTitle,
				testament: input.testament,
				bookGroup: input.group,
			})
			.where(eq(books.id, book.id));
		await tx.delete(bookAliases).where(eq(bookAliases.bookId, book.id));
		if (aliases.length > 0) {
			await tx
				.insert(bookAliases)
				.values(aliases.map((alias) => ({ bookId: book.id, alias })));
		}

		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "book.record_changed",
			targetType: "book",
			targetId: book.id,
			details: { name },
		});
	});
}

/** Passes a suggestion to everyone who can change book records. */
export async function suggestBookChange(
	client: DbExecutor,
	input: { actorUserId: string; slug: string; suggestion: string },
) {
	const suggestion = input.suggestion.trim();
	if (!suggestion) throw new GovernanceError("Say what should change.");

	await client.transaction(async (tx) => {
		const [book] = await tx
			.select({ name: books.name })
			.from(books)
			.where(eq(books.slug, input.slug));
		if (!book) throw new GovernanceError("This book no longer exists.");

		for (const userId of await holdersOf(tx, "scripture.manage")) {
			if (userId === input.actorUserId) continue;
			await createNotification(tx, {
				userId,
				kind: "book_change_suggestion",
				title: `Suggested change to ${book.name}`,
				body: suggestion,
				destination: `/admin/scripture/${input.slug}?tab=record`,
			});
		}
	});
}
