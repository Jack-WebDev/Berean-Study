import { db } from "@berean-study/db";
import {
	addPassageToCollection as addPassageToCollectionInDb,
	listCollectionsForPassage as listCollectionsForPassageInDb,
	removePassageFromCollection as removePassageFromCollectionInDb,
} from "@berean-study/db/collections";
import { GovernanceError } from "@berean-study/db/governance-error";
import {
	chooseReaderTranslation as chooseReaderTranslationInDb,
	getPassageStart as getPassageStartFromDb,
	getReaderChapter as getReaderChapterFromDb,
	getReadingPlace as getReadingPlaceFromDb,
	getReadingPreferences as getReadingPreferencesFromDb,
	listAvailableChapters as listAvailableChaptersFromDb,
	listCanonBooks as listCanonBooksFromDb,
	listHighlightedVerses,
	listNoteMarkers,
	listReaderTranslations as listReaderTranslationsFromDb,
	listRecentChapters as listRecentChaptersFromDb,
	listStudyMarkers,
	passagesForVerses as passagesForVersesInDb,
	recordChapterVisit as recordChapterVisitInDb,
	saveReadingPlace as saveReadingPlaceInDb,
	saveReadingPreferences as saveReadingPreferencesInDb,
	saveVerses as saveVersesInDb,
	setVersesHighlighted as setVersesHighlightedInDb,
	undoHighlightChange as undoHighlightChangeInDb,
	unsaveVerses as unsaveVersesInDb,
	verseWords as verseWordsFromDb,
} from "@berean-study/db/reader";
import {
	getAboutBook as getAboutBookFromDb,
	getBookPage as getBookPageFromDb,
	getContinueReading as getContinueReadingFromDb,
} from "@berean-study/db/reader-books";
import {
	browseTestaments,
	lineLengths,
	pageColours,
	readingTextSizes,
	studyProblemKinds,
	verseLayouts,
} from "@berean-study/db/reader-catalogue";
import {
	getVerseStudy as getVerseStudyFromDb,
	reportStudyProblem as reportStudyProblemInDb,
} from "@berean-study/db/reader-study";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware, requirePermission } from "@/middleware/auth";

function requireUserId(session: { user: { id: string } } | null) {
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

const bookSlugSchema = z
	.string()
	.trim()
	.regex(/^[a-z0-9-]+$/)
	.max(60);
const numberSchema = z.number().int().positive().max(200);
const translationSchema = z.string().trim().min(1).max(20);

const chapterSchema = z.object({
	bookSlug: bookSlugSchema,
	chapter: numberSchema,
});

const chapterInTranslationSchema = chapterSchema.extend({
	translationAbbreviation: translationSchema,
});

const chosenVersesSchema = chapterInTranslationSchema.extend({
	verses: z.array(numberSchema).min(1).max(200),
});

export const getReadingPreferences = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		getReadingPreferencesFromDb(db, requireUserId(context.session)),
	);

export const saveReadingPreferences = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z
			.object({
				browseTestament: z.enum(browseTestaments),
				lineLength: z.enum(lineLengths),
				pageColour: z.enum(pageColours),
				readerHintSeen: z.literal(true),
				showSectionHeadings: z.boolean(),
				showVerseNumbers: z.boolean(),
				textSize: z.enum(readingTextSizes),
				traditionSlug: bookSlugSchema,
				translationAbbreviation: translationSchema,
				verseLayout: z.enum(verseLayouts),
				welcomeCompleted: z.literal(true),
			})
			.partial(),
	)
	.handler(({ context, data }) =>
		saveReadingPreferencesInDb(db, requireUserId(context.session), data),
	);

export const listReaderTranslations = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		requireUserId(context.session);
		return listReaderTranslationsFromDb(db);
	});

/** The member's book list, from the tradition they chose. */
export const listCanonBooks = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const userId = requireUserId(context.session);
		const { traditionSlug, translationAbbreviation } =
			await getReadingPreferencesFromDb(db, userId);
		const translation = await chooseReaderTranslationInDb(db, [
			translationAbbreviation,
		]);
		return listCanonBooksFromDb(db, traditionSlug, translation?.id ?? null);
	});

/** Choose a chapter: the book, its chapters, and the one last read. */
export const getBookPage = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ bookSlug: bookSlugSchema }))
	.handler(async ({ context, data }) => {
		const userId = requireUserId(context.session);
		const preferences = await getReadingPreferencesFromDb(db, userId);
		return getBookPageFromDb(db, userId, {
			bookSlug: data.bookSlug,
			traditionSlug: preferences.traditionSlug,
			translationAbbreviations: [preferences.translationAbbreviation],
		});
	});

/** About this book: the book overview and introduction as one page. */
export const getAboutBook = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ bookSlug: bookSlugSchema }))
	.handler(async ({ context, data }) => {
		const userId = requireUserId(context.session);
		const preferences = await getReadingPreferencesFromDb(db, userId);
		return getAboutBookFromDb(db, {
			bookSlug: data.bookSlug,
			translationAbbreviations: [preferences.translationAbbreviation],
		});
	});

/** The Continue reading card on Browse. */
export const getContinueReading = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const userId = requireUserId(context.session);
		const preferences = await getReadingPreferencesFromDb(db, userId);
		return getContinueReadingFromDb(db, userId, [
			preferences.translationAbbreviation,
		]);
	});

/**
 * One chapter, in the translation asked for, else the member's preferred one,
 * else the first available. Null when the chapter can't exist.
 */
export const getReaderChapter = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(
		chapterSchema.extend({
			translationAbbreviation: translationSchema.optional(),
		}),
	)
	.handler(async ({ context, data }) => {
		const userId = requireUserId(context.session);
		const preferences = await getReadingPreferencesFromDb(db, userId);
		return getReaderChapterFromDb(db, {
			bookSlug: data.bookSlug,
			chapter: data.chapter,
			traditionSlug: preferences.traditionSlug,
			translationAbbreviations: [
				data.translationAbbreviation,
				preferences.translationAbbreviation,
			],
		});
	});

export const listAvailableChapters = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			bookSlug: bookSlugSchema,
			translationAbbreviation: translationSchema,
		}),
	)
	.handler(({ context, data }) => {
		requireUserId(context.session);
		return listAvailableChaptersFromDb(db, data);
	});

/** The small marks beside verses: study dots, the member's note pencils and highlights. */
export const getChapterMarks = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(chapterInTranslationSchema)
	.handler(async ({ context, data }) => {
		const userId = requireUserId(context.session);
		const [highlighted, noted, study] = await Promise.all([
			listHighlightedVerses(db, userId, data),
			listNoteMarkers(db, userId, data),
			listStudyMarkers(db, data),
		]);
		return { highlighted, noted, study };
	});

export const setVersesHighlighted = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(chosenVersesSchema.extend({ highlighted: z.boolean() }))
	.handler(({ context, data }) =>
		setVersesHighlightedInDb(db, requireUserId(context.session), data),
	);

const idListSchema = z.array(z.number().int().positive()).max(200);

export const undoHighlightChange = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.union([
			z.object({ remove: idListSchema }),
			z.object({
				restore: z
					.array(
						z.object({
							endOffset: z.number().int().positive(),
							startOffset: z.number().int().nonnegative(),
							translationId: z.number().int().positive(),
							verseId: z.number().int().positive(),
						}),
					)
					.max(500),
			}),
		]),
	)
	.handler(({ context, data }) =>
		undoHighlightChangeInDb(db, requireUserId(context.session), data),
	);

/** Stored passages for chosen verses, for adding them to notes, collections or posts. */
export const passagesForVerses = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(chosenVersesSchema)
	.handler(({ context, data }) => {
		requireUserId(context.session);
		return passagesForVersesInDb(db, data);
	});

export const saveVerses = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(chosenVersesSchema)
	.handler(({ context, data }) =>
		saveVersesInDb(db, requireUserId(context.session), data),
	);

export const unsaveVerses = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ passageIds: idListSchema }))
	.handler(({ context, data }) =>
		unsaveVersesInDb(db, requireUserId(context.session), data.passageIds),
	);

export const getReadingPlace = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		getReadingPlaceFromDb(db, requireUserId(context.session)),
	);

export const saveReadingPlace = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		chapterSchema.extend({
			translationAbbreviation: translationSchema.nullable(),
			verse: numberSchema,
		}),
	)
	.handler(({ context, data }) =>
		saveReadingPlaceInDb(db, requireUserId(context.session), data),
	);

export const recordChapterVisit = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(chapterSchema)
	.handler(({ context, data }) =>
		recordChapterVisitInDb(db, requireUserId(context.session), data),
	);

export const listRecentChapters = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listRecentChaptersFromDb(db, requireUserId(context.session)),
	);

/** Where an older stored-passage link should open the reading page. */
export const getPassageStart = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ passageId: z.number().int().positive() }))
	.handler(({ context, data }) => {
		requireUserId(context.session);
		return getPassageStartFromDb(db, data.passageId);
	});

/**
 * Adds chosen verses to one of the member's collections. Verses already in it are
 * left alone, and only what this added is returned, so Undo removes exactly that.
 */
export const addVersesToCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		chosenVersesSchema.extend({ collectionId: z.number().int().positive() }),
	)
	.handler(async ({ context, data }) => {
		const userId = requireUserId(context.session);
		const { collectionId, ...verses } = data;
		const { label, passages } = await passagesForVersesInDb(db, verses);
		const addedPassageIds: number[] = [];
		let collectionName = "";
		for (const { passageId } of passages) {
			const collections = await listCollectionsForPassageInDb(
				db,
				userId,
				passageId,
			);
			const collection = collections.find((item) => item.id === collectionId);
			if (!collection) throw new Error("This collection no longer exists.");
			collectionName = collection.name;
			if (collection.isSelected) continue;
			await addPassageToCollectionInDb(
				db,
				userId,
				collectionId,
				passageId,
				null,
			);
			addedPassageIds.push(passageId);
		}
		return { addedPassageIds, collectionName, label };
	});

/** Undo for adding verses to a collection. */
export const removeVersesFromCollection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			collectionId: z.number().int().positive(),
			passageIds: idListSchema,
		}),
	)
	.handler(async ({ context, data }) => {
		const userId = requireUserId(context.session);
		for (const passageId of data.passageIds) {
			await removePassageFromCollectionInDb(
				db,
				userId,
				data.collectionId,
				passageId,
			);
		}
	});

/** The published words of chosen verses, for showing before they're shared. */
export const getVerseWords = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(chosenVersesSchema)
	.handler(({ context, data }) => {
		requireUserId(context.session);
		return verseWordsFromDb(db, data);
	});

/** Live study notes on chosen verses, for the study panel. Null if the book doesn't exist. */
export const getVerseStudy = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(chosenVersesSchema)
	.handler(({ context, data }) => {
		requireUserId(context.session);
		return getVerseStudyFromDb(db, data);
	});

const studyProblemTypes = studyProblemKinds.map(({ type }) => type) as [
	(typeof studyProblemKinds)[number]["type"],
	...(typeof studyProblemKinds)[number]["type"][],
];

/** A member reports a problem with a study note, for staff's Content Issues list. */
export const reportStudyProblem = createServerFn({ method: "POST" })
	.middleware([requirePermission("issues.create")])
	.validator(
		z.object({
			description: z.string().trim().min(1).max(2000),
			issueType: z.enum(studyProblemTypes),
			revisionId: z.number().int().positive(),
		}),
	)
	.handler(async ({ context, data }) => {
		try {
			await reportStudyProblemInDb(db, {
				...data,
				actorUserId: context.userId,
			});
			return { status: "sent" as const };
		} catch (error) {
			// Refusals are written for the reader, so they're shown as they are.
			if (error instanceof GovernanceError) {
				return { message: error.message, status: "refused" as const };
			}
			throw error;
		}
	});
