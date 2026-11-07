import { and, asc, between, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { parseConnectionScopeKey } from "./connection-body";
import { contentAtPassage } from "./content-links";
import type { db } from "./index";
import { parsePassageKey } from "./passage-key";
import { books } from "./schema/books";
import { chapters } from "./schema/chapters";
import { passageRanges } from "./schema/passage_ranges";
import { passages } from "./schema/passages";
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
	const [passage] = await db
		.select({ bookName: books.name, id: passages.id, title: passages.title })
		.from(passages)
		.innerJoin(books, eq(books.id, passages.bookId))
		.where(eq(passages.id, passageId))
		.limit(1);
	if (!passage) return null;

	const attached = (
		await Promise.all(
			(
				await passageVerseRanges(db, [passageId])
			).map((range) =>
				contentAtPassage(db, range, {
					kinds: ["cross_reference", "canonical_relationship", "theme"],
					revision: "live",
				}),
			),
		)
	).flat();

	const themeNames = new Set<string>();
	const otherEnds = new Set<string>();
	for (const { kind, scopeKey, title } of attached) {
		if (kind === "theme") {
			themeNames.add(title);
			continue;
		}
		const ends = parseConnectionScopeKey(
			kind === "cross_reference" ? "cross_reference" : "canonical_relationship",
			scopeKey,
		);
		if (ends) {
			otherEnds.add(ends.first);
			otherEnds.add(ends.second);
		}
	}

	const relatedPassageIds = new Set(
		(await passagesCovering(db, [...otherEnds])).filter(
			(id) => id !== passageId,
		),
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
		themes: [...themeNames].sort((a, b) => a.localeCompare(b)),
	};
}

const startVerse = alias(verses, "start_verse");
const endVerse = alias(verses, "end_verse");
const startChapter = alias(chapters, "start_chapter");
const endChapter = alias(chapters, "end_chapter");

/** Each stored passage's ranges, as book and verse numbers. */
function storedPassageRanges(db: DbClient) {
	return db
		.select({
			bookId: startChapter.bookId,
			fromChapter: startChapter.number,
			fromVerse: startVerse.number,
			passageId: passageRanges.passageId,
			toChapter: endChapter.number,
			toVerse: endVerse.number,
		})
		.from(passageRanges)
		.innerJoin(startVerse, eq(startVerse.id, passageRanges.startVerseId))
		.innerJoin(endVerse, eq(endVerse.id, passageRanges.endVerseId))
		.innerJoin(startChapter, eq(startChapter.id, startVerse.chapterId))
		.innerJoin(endChapter, eq(endChapter.id, endVerse.chapterId));
}

async function passageVerseRanges(db: DbClient, passageIds: number[]) {
	const rows = await storedPassageRanges(db).where(
		inArray(passageRanges.passageId, passageIds),
	);
	return rows.map((row) => ({
		bookId: row.bookId,
		from: { chapter: row.fromChapter, verse: row.fromVerse },
		to: { chapter: row.toChapter, verse: row.toVerse },
	}));
}

/**
 * Stored passages that include these verses. Connections name verses directly, and
 * the member Bible opens stored passages, so a connection with no matching passage
 * has nothing to open and isn't listed.
 */
async function passagesCovering(db: DbClient, keys: readonly string[]) {
	const wanted = keys.flatMap((key) => {
		const passage = parsePassageKey(key);
		return passage ? [passage] : [];
	});
	if (wanted.length === 0) return [];
	const ids = new Set<number>();
	for (const { bookSlug, from, to } of wanted) {
		const rows = await storedPassageRanges(db)
			.innerJoin(books, eq(books.id, startChapter.bookId))
			.where(
				and(
					eq(books.slug, bookSlug),
					sql`(${startChapter.number}, ${startVerse.number}) <= (${to.chapter}, ${to.verse})`,
					sql`(${endChapter.number}, ${endVerse.number}) >= (${from.chapter}, ${from.verse})`,
				),
			);
		for (const { passageId } of rows) ids.add(passageId);
	}
	return [...ids];
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

export type PassageExcerpt = {
	passageId: number;
	/** Where the passage sits, such as "Psalm 88:1–3"; its title if unmapped. */
	reference: string;
	title: string | null;
	/** The passage's opening verses, empty when the translation lacks them. */
	verses: PassageVerse[];
};

/**
 * Writes a verse range the way readers do: "Psalm 88:1–3", "John 3:16",
 * "Romans 7:24–8:2". A single psalm is "Psalm", not "Psalms".
 */
export function formatPassageReference(
	bookName: string,
	start: [chapter: number, verse: number],
	end: [chapter: number, verse: number],
) {
	const [startChapter, startVerse] = start;
	const [endChapter, endVerse] = end;
	const sameChapter = startChapter === endChapter;
	const book = bookName === "Psalms" && sameChapter ? "Psalm" : bookName;
	if (!sameChapter) {
		return `${book} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`;
	}
	if (startVerse === endVerse) return `${book} ${startChapter}:${startVerse}`;
	return `${book} ${startChapter}:${startVerse}–${endVerse}`;
}

/**
 * Returns each passage's reference and up to `maxVerses` opening verses in one
 * translation, for previews such as collection covers. Everything is fetched
 * in two queries however many passages are asked for.
 */
export async function getPassageExcerpts(
	db: DbClient,
	passageIds: readonly number[],
	translationId: number | null,
	maxVerses: number,
): Promise<Map<number, PassageExcerpt>> {
	const ids = [...new Set(passageIds)];
	if (ids.length === 0) return new Map();

	const [translation] = translationId
		? await db
				.select({ versificationSystemId: translations.versificationSystemId })
				.from(translations)
				.where(eq(translations.id, translationId))
				.limit(1)
		: [];
	const versificationSystemId = translation?.versificationSystemId ?? null;

	const startVerse = alias(verses, "start_verse");
	const startChapter = alias(chapters, "start_chapter");
	const endVerse = alias(verses, "end_verse");
	const endChapter = alias(chapters, "end_chapter");
	const rangeJoin = versificationSystemId
		? and(
				eq(passageRanges.passageId, passages.id),
				eq(passageRanges.versificationSystemId, versificationSystemId),
			)
		: sql`false`;
	const ranges = await db
		.select({
			bookName: books.name,
			endChapter: endChapter.number,
			endVerse: endVerse.number,
			id: passages.id,
			startChapter: startChapter.number,
			startVerse: startVerse.number,
			title: passages.title,
		})
		.from(passages)
		.innerJoin(books, eq(books.id, passages.bookId))
		.leftJoin(passageRanges, rangeJoin)
		.leftJoin(startVerse, eq(startVerse.id, passageRanges.startVerseId))
		.leftJoin(startChapter, eq(startChapter.id, startVerse.chapterId))
		.leftJoin(endVerse, eq(endVerse.id, passageRanges.endVerseId))
		.leftJoin(endChapter, eq(endChapter.id, endVerse.chapterId))
		.where(inArray(passages.id, ids));

	const versesByPassage = new Map<number, PassageVerse[]>();
	if (translationId && versificationSystemId && maxVerses > 0) {
		const verseChapter = alias(chapters, "verse_chapter");
		const numbered = db
			.select({
				chapter: sql<number>`${verseChapter.number}`.as("chapter"),
				number: sql<number>`${verses.number}`.as("number"),
				passageId: sql<number>`${passageRanges.passageId}`.as("passage_id"),
				rank: sql<number>`row_number() OVER (PARTITION BY ${passageRanges.passageId} ORDER BY ${verseChapter.number}, ${verses.number})`.as(
					"rank",
				),
				text: sql<string>`${verseTexts.text}`.as("text"),
			})
			.from(passageRanges)
			.innerJoin(startVerse, eq(startVerse.id, passageRanges.startVerseId))
			.innerJoin(startChapter, eq(startChapter.id, startVerse.chapterId))
			.innerJoin(endVerse, eq(endVerse.id, passageRanges.endVerseId))
			.innerJoin(endChapter, eq(endChapter.id, endVerse.chapterId))
			.innerJoin(
				verseChapter,
				and(
					eq(verseChapter.bookId, startChapter.bookId),
					eq(
						verseChapter.versificationSystemId,
						passageRanges.versificationSystemId,
					),
					between(verseChapter.number, startChapter.number, endChapter.number),
				),
			)
			.innerJoin(
				verses,
				and(
					eq(verses.chapterId, verseChapter.id),
					sql`(${verseChapter.number}, ${verses.number}) BETWEEN (${startChapter.number}, ${startVerse.number}) AND (${endChapter.number}, ${endVerse.number})`,
				),
			)
			.innerJoin(
				verseTexts,
				and(
					eq(verseTexts.verseId, verses.id),
					eq(verseTexts.translationId, translationId),
				),
			)
			.where(
				and(
					inArray(passageRanges.passageId, ids),
					eq(passageRanges.versificationSystemId, versificationSystemId),
				),
			)
			.as("numbered");
		const rows = await db
			.select({
				chapter: numbered.chapter,
				number: numbered.number,
				passageId: numbered.passageId,
				text: numbered.text,
			})
			.from(numbered)
			.where(lte(numbered.rank, maxVerses))
			.orderBy(asc(numbered.passageId), asc(numbered.rank));
		for (const { passageId, ...verse } of rows) {
			const list = versesByPassage.get(passageId) ?? [];
			list.push(verse);
			versesByPassage.set(passageId, list);
		}
	}

	return new Map(
		ranges.map((range) => {
			const { endChapter, endVerse, startChapter, startVerse } = range;
			const reference =
				startChapter !== null &&
				startVerse !== null &&
				endChapter !== null &&
				endVerse !== null
					? formatPassageReference(
							range.bookName,
							[startChapter, startVerse],
							[endChapter, endVerse],
						)
					: (range.title ?? range.bookName);
			return [
				range.id,
				{
					passageId: range.id,
					reference,
					title: range.title,
					verses: versesByPassage.get(range.id) ?? [],
				},
			];
		}),
	);
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
