import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { user } from "./schema/auth";
import { books } from "./schema/books";
import { chapters } from "./schema/chapters";
import { versePresence } from "./schema/verse_presence";
import { verseTextRevisions } from "./schema/verse_text_revisions";
import { verseTexts } from "./schema/verse_texts";
import { verses } from "./schema/verses";
import {
	hasOwnText,
	type VersePresenceKind,
	type VerseTextStatus,
} from "./scripture-catalogue";
import {
	getTranslation,
	publishingBlock,
	toDateString,
} from "./translations-admin";

/** Revisions still moving towards publication. A verse has at most one per translation. */
export const openRevisionStatuses = [
	"draft",
	"submitted",
	"needs_fix",
	"proofread",
] as const;

export type ChapterAddress = {
	abbreviation: string;
	chapter: number;
	slug: string;
};

export async function getBookBySlug(client: DbExecutor, slug: string) {
	const [book] = await client.select().from(books).where(eq(books.slug, slug));
	if (!book) throw new GovernanceError("This book no longer exists.");
	return book;
}

/** The translation, book and chapter an address points to. */
export async function resolveChapter(
	client: DbExecutor,
	address: ChapterAddress,
) {
	const translation = await getTranslation(client, address.abbreviation);
	const book = await getBookBySlug(client, address.slug);
	const [chapter] = await client
		.select()
		.from(chapters)
		.where(
			and(
				eq(chapters.bookId, book.id),
				eq(chapters.versificationSystemId, translation.versificationSystemId),
				eq(chapters.number, address.chapter),
			),
		);
	if (!chapter) throw new GovernanceError("This chapter no longer exists.");
	return { book, chapter, translation };
}

/**
 * Holds the chapter until the transaction ends. Moving verses between steps looks
 * at the whole chapter first, so two people acting at once must take turns.
 */
export async function lockChapter(client: DbExecutor, chapterId: number) {
	await client
		.select({ id: chapters.id })
		.from(chapters)
		.where(eq(chapters.id, chapterId))
		.for("update");
}

export function chapterName(
	book: { name: string },
	chapter: { number: number },
	translation: { abbreviation: string },
) {
	return `${book.name} ${chapter.number} · ${translation.abbreviation}`;
}

export function currentPublishingBlock(translation: {
	licensed: boolean;
	permissionRecordedAt: Date | null;
	licenceEndsOn: string | null;
}) {
	return publishingBlock(translation, toDateString(new Date()));
}

function statusOf(row: {
	publishedText: string | null;
	revisionStatus: VerseTextStatus | "superseded" | null;
}): VerseTextStatus {
	if (row.revisionStatus && row.revisionStatus !== "superseded") {
		return row.revisionStatus;
	}
	return row.publishedText === null ? "empty" : "published";
}

/** Every verse of a chapter as it stands in one translation, in order. */
export async function loadChapterVerses(
	client: DbExecutor,
	chapterId: number,
	translationId: number,
) {
	const enterer = alias(user, "enterer");
	const proofreader = alias(user, "proofreader");
	const returner = alias(user, "returner");
	const includedVerse = alias(verses, "included_verse");

	const rows = await client
		.select({
			verseId: verses.id,
			number: verses.number,
			publishedText: verseTexts.text,
			revisionId: verseTextRevisions.id,
			revisionStatus: verseTextRevisions.status,
			revisionText: verseTextRevisions.text,
			enteredByUserId: verseTextRevisions.enteredByUserId,
			enteredByName: enterer.name,
			proofMark: verseTextRevisions.proofMark,
			proofreadByUserId: verseTextRevisions.proofreadByUserId,
			proofreadByName: proofreader.name,
			suggestedText: verseTextRevisions.suggestedText,
			proofNote: verseTextRevisions.proofNote,
			returnedByName: returner.name,
			correctionReason: verseTextRevisions.correctionReason,
			checkedAgainst: verseTextRevisions.checkedAgainst,
			presenceKind: versePresence.kind,
			includedInVerse: includedVerse.number,
		})
		.from(verses)
		.leftJoin(
			verseTexts,
			and(
				eq(verseTexts.verseId, verses.id),
				eq(verseTexts.translationId, translationId),
			),
		)
		.leftJoin(
			verseTextRevisions,
			and(
				eq(verseTextRevisions.verseId, verses.id),
				eq(verseTextRevisions.translationId, translationId),
				inArray(verseTextRevisions.status, [...openRevisionStatuses]),
			),
		)
		.leftJoin(
			versePresence,
			and(
				eq(versePresence.verseId, verses.id),
				eq(versePresence.translationId, translationId),
			),
		)
		.leftJoin(
			includedVerse,
			eq(includedVerse.id, versePresence.includedInVerseId),
		)
		.leftJoin(enterer, eq(enterer.id, verseTextRevisions.enteredByUserId))
		.leftJoin(
			proofreader,
			eq(proofreader.id, verseTextRevisions.proofreadByUserId),
		)
		.leftJoin(returner, eq(returner.id, verseTextRevisions.returnedByUserId))
		.where(eq(verses.chapterId, chapterId))
		.orderBy(asc(verses.number));

	return rows.map((row) => ({
		...row,
		needsOwnText: hasOwnText(row.presenceKind as VersePresenceKind | null),
		status: statusOf(row),
	}));
}

export type ChapterVerse = Awaited<
	ReturnType<typeof loadChapterVerses>
>[number];

/**
 * The verses still standing between a chapter and being complete for readers. A
 * correction waiting on a published verse doesn't count: its current text stands.
 */
export function versesBlockingPublication(rows: readonly ChapterVerse[]) {
	return rows
		.filter(
			(row) =>
				row.needsOwnText &&
				row.publishedText === null &&
				row.status !== "proofread",
		)
		.map(({ number }) => number);
}
