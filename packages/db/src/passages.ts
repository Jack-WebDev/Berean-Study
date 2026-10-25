import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { db } from "./index";
import { books } from "./schema/books";
import { canonicalRelationships } from "./schema/canonical_relationships";
import { chapters } from "./schema/chapters";
import { crossReferences } from "./schema/cross_references";
import { passageRanges } from "./schema/passage_ranges";
import { passages } from "./schema/passages";
import { themePassages } from "./schema/theme_passages";
import { themes } from "./schema/themes";
import { translations } from "./schema/translations";
import { userPreferences } from "./schema/user_preferences";
import { verseTexts } from "./schema/verse_texts";
import { verses } from "./schema/verses";

type DbClient = typeof db;

export type PassageOption = {
	id: number;
	label: string;
};

export type PassageStudyContext = {
	passage: PassageOption;
	relatedPassages: PassageOption[];
	themes: string[];
};

export async function getPassageOptions(
	db: DbClient,
): Promise<PassageOption[]> {
	const rows = await db
		.select({
			bookName: books.name,
			id: passages.id,
			title: passages.title,
		})
		.from(passages)
		.innerJoin(books, eq(books.id, passages.bookId))
		.orderBy(asc(books.id), asc(passages.id));

	return rows.map((passage) => ({
		id: passage.id,
		label: passage.title ?? passage.bookName,
	}));
}

/**
 * Returns the published study material associated with a conceptual passage.
 * Personal note data deliberately does not participate in this query.
 */
export async function getPassageStudyContext(
	db: DbClient,
	passageId: number,
): Promise<PassageStudyContext | null> {
	const [
		passageRows,
		passageThemes,
		outgoingCrossReferences,
		incomingCrossReferences,
		outgoingCanonicalRelationships,
		incomingCanonicalRelationships,
	] = await Promise.all([
		db
			.select({ bookName: books.name, id: passages.id, title: passages.title })
			.from(passages)
			.innerJoin(books, eq(books.id, passages.bookId))
			.where(eq(passages.id, passageId))
			.limit(1),
		db
			.select({ name: themes.name })
			.from(themePassages)
			.innerJoin(themes, eq(themes.id, themePassages.themeId))
			.where(eq(themePassages.passageId, passageId))
			.orderBy(asc(themes.name)),
		db
			.select({ id: crossReferences.relatedPassageId })
			.from(crossReferences)
			.where(eq(crossReferences.passageId, passageId)),
		db
			.select({ id: crossReferences.passageId })
			.from(crossReferences)
			.where(eq(crossReferences.relatedPassageId, passageId)),
		db
			.select({ id: canonicalRelationships.targetPassageId })
			.from(canonicalRelationships)
			.where(eq(canonicalRelationships.sourcePassageId, passageId)),
		db
			.select({ id: canonicalRelationships.sourcePassageId })
			.from(canonicalRelationships)
			.where(eq(canonicalRelationships.targetPassageId, passageId)),
	]);

	const [passage] = passageRows;
	if (!passage) return null;

	const relatedPassageIds = new Set(
		[
			...outgoingCrossReferences,
			...incomingCrossReferences,
			...outgoingCanonicalRelationships,
			...incomingCanonicalRelationships,
		].map((relatedPassage) => relatedPassage.id),
	);
	const relatedPassages = relatedPassageIds.size
		? await db
				.select({
					bookName: books.name,
					id: passages.id,
					title: passages.title,
				})
				.from(passages)
				.innerJoin(books, eq(books.id, passages.bookId))
				.where(inArray(passages.id, [...relatedPassageIds]))
				.orderBy(desc(passages.id))
				.limit(6)
		: [];

	return {
		passage: toPassageOption(passage),
		relatedPassages: relatedPassages.map(toPassageOption),
		themes: passageThemes.map((theme) => theme.name),
	};
}

function toPassageOption(passage: {
	bookName: string;
	id: number;
	title: string | null;
}): PassageOption {
	return {
		id: passage.id,
		label: passage.title ?? passage.bookName,
	};
}

export type Translation = {
	abbreviation: string;
	id: number;
	name: string;
};

export type PassageVerse = {
	chapter: number;
	number: number;
	text: string;
};

export type PassageText = {
	bookId: number;
	bookName: string;
	passage: PassageOption;
	translation: Translation;
	verses: PassageVerse[];
};

export type VerseRangeInput = {
	bookId: number;
	chapter: number;
	translation: string;
	verseEnd: number;
	verseStart: number;
};

/** Upper bound on verses returned for one request, to keep panels responsive. */
const maxVersesPerRequest = 200;

export async function listTranslations(db: DbClient): Promise<Translation[]> {
	return db
		.select({
			abbreviation: translations.abbreviation,
			id: translations.id,
			name: translations.name,
		})
		.from(translations)
		.orderBy(asc(translations.name));
}

/** Returns the member's preferred translation, falling back to the first one. */
export async function getPreferredTranslation(
	db: DbClient,
	userId: string,
): Promise<Translation | null> {
	const [preferred] = await db
		.select({
			abbreviation: translations.abbreviation,
			id: translations.id,
			name: translations.name,
		})
		.from(userPreferences)
		.innerJoin(
			translations,
			eq(translations.id, userPreferences.preferredTranslationId),
		)
		.where(eq(userPreferences.userId, userId))
		.limit(1);

	return preferred ?? (await listTranslations(db))[0] ?? null;
}

/**
 * Returns a passage's verses in one translation, using the passage range that
 * matches the translation's versification. Verses without text are omitted.
 */
export async function getPassageText(
	db: DbClient,
	passageId: number,
	translationId: number,
): Promise<PassageText | null> {
	const [passageRows, translationRows] = await Promise.all([
		db
			.select({
				bookId: books.id,
				bookName: books.name,
				id: passages.id,
				title: passages.title,
			})
			.from(passages)
			.innerJoin(books, eq(books.id, passages.bookId))
			.where(eq(passages.id, passageId))
			.limit(1),
		db
			.select({
				abbreviation: translations.abbreviation,
				id: translations.id,
				name: translations.name,
				versificationSystemId: translations.versificationSystemId,
			})
			.from(translations)
			.where(eq(translations.id, translationId))
			.limit(1),
	]);
	const [passage] = passageRows;
	const [translation] = translationRows;
	if (!passage || !translation) return null;

	const startVerse = alias(verses, "start_verse");
	const startChapter = alias(chapters, "start_chapter");
	const endVerse = alias(verses, "end_verse");
	const endChapter = alias(chapters, "end_chapter");
	const [range] = await db
		.select({
			bookId: startChapter.bookId,
			endChapter: endChapter.number,
			endVerse: endVerse.number,
			startChapter: startChapter.number,
			startVerse: startVerse.number,
		})
		.from(passageRanges)
		.innerJoin(startVerse, eq(startVerse.id, passageRanges.startVerseId))
		.innerJoin(startChapter, eq(startChapter.id, startVerse.chapterId))
		.innerJoin(endVerse, eq(endVerse.id, passageRanges.endVerseId))
		.innerJoin(endChapter, eq(endChapter.id, endVerse.chapterId))
		.where(
			and(
				eq(passageRanges.passageId, passageId),
				eq(
					passageRanges.versificationSystemId,
					translation.versificationSystemId,
				),
			),
		)
		.limit(1);

	const passageVerses = range
		? await selectVerseTexts(db, {
				bookId: range.bookId,
				end: [range.endChapter, range.endVerse],
				start: [range.startChapter, range.startVerse],
				translationId: translation.id,
				versificationSystemId: translation.versificationSystemId,
			})
		: [];

	return {
		bookId: passage.bookId,
		bookName: passage.bookName,
		passage: toPassageOption(passage),
		translation: {
			abbreviation: translation.abbreviation,
			id: translation.id,
			name: translation.name,
		},
		verses: passageVerses,
	};
}

/** Returns the text of a quoted verse range within one chapter. */
export async function getVerseRangeText(
	db: DbClient,
	input: VerseRangeInput,
): Promise<Array<{ number: number; text: string }>> {
	const [translation] = await db
		.select({
			id: translations.id,
			versificationSystemId: translations.versificationSystemId,
		})
		.from(translations)
		.where(eq(translations.abbreviation, input.translation))
		.limit(1);
	if (!translation) return [];

	const rangeVerses = await selectVerseTexts(db, {
		bookId: input.bookId,
		end: [input.chapter, input.verseEnd],
		start: [input.chapter, input.verseStart],
		translationId: translation.id,
		versificationSystemId: translation.versificationSystemId,
	});
	return rangeVerses.map(({ number, text }) => ({ number, text }));
}

async function selectVerseTexts(
	db: DbClient,
	input: {
		bookId: number;
		end: [chapter: number, verse: number];
		start: [chapter: number, verse: number];
		translationId: number;
		versificationSystemId: number;
	},
): Promise<PassageVerse[]> {
	const [startChapter, startVerse] = input.start;
	const [endChapter, endVerse] = input.end;
	return db
		.select({
			chapter: chapters.number,
			number: verses.number,
			text: verseTexts.text,
		})
		.from(verses)
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.innerJoin(
			verseTexts,
			and(
				eq(verseTexts.verseId, verses.id),
				eq(verseTexts.translationId, input.translationId),
			),
		)
		.where(
			and(
				eq(chapters.bookId, input.bookId),
				eq(chapters.versificationSystemId, input.versificationSystemId),
				sql`(${chapters.number}, ${verses.number}) BETWEEN (${startChapter}, ${startVerse}) AND (${endChapter}, ${endVerse})`,
			),
		)
		.orderBy(asc(chapters.number), asc(verses.number))
		.limit(maxVersesPerRequest);
}
