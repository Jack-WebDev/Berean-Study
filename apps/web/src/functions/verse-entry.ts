import { db } from "@berean-study/db";
import {
	addChapter as addChapterInDb,
	addVerse as addVerseInDb,
	getEntryChapter as getEntryChapterFromDb,
	getVerseAcrossTranslations as getVerseAcrossTranslationsFromDb,
	listEntryTraditions as listEntryTraditionsFromDb,
	proposeVerseCorrection as proposeVerseCorrectionInDb,
	removeLastChapter as removeLastChapterInDb,
	removeLastVerse as removeLastVerseInDb,
	saveVerseDrafts as saveVerseDraftsInDb,
	sendChapterForProofreading as sendChapterForProofreadingInDb,
} from "@berean-study/db/verse-entry";
import { HIGHEST_VERSE_NUMBER } from "@berean-study/db/verse-text-tools";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { verseTextReaderPermissions } from "@/components/staff/scripture/scripture-access";
import { requirePermission } from "@/middleware/auth";

const abbreviationSchema = z.string().trim().min(1).max(10);
const slugSchema = z.string().trim().min(1).max(100);
const chapterSchema = z.number().int().positive().max(200);
const verseSchema = z.number().int().positive().max(HIGHEST_VERSE_NUMBER);
// The longest verse is under 600 characters, so this only stops accidents.
const verseTextSchema = z.string().max(4000);

const chapterAddressSchema = z.object({
	abbreviation: abbreviationSchema,
	chapter: chapterSchema,
	slug: slugSchema,
});

export const listEntryTraditions = createServerFn({ method: "GET" })
	.middleware([requirePermission("scripture.enter")])
	.handler(() => listEntryTraditionsFromDb(db));

export const getEntryChapter = createServerFn({ method: "GET" })
	.middleware([requirePermission("scripture.enter")])
	.validator(
		z.object({
			abbreviation: abbreviationSchema.optional(),
			canon: slugSchema.optional(),
			chapter: chapterSchema.optional(),
			slug: slugSchema.optional(),
		}),
	)
	.handler(({ context, data }) =>
		getEntryChapterFromDb(db, data, context.userId),
	);

export const addChapter = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.enter")])
	.validator(z.object({ abbreviation: abbreviationSchema, slug: slugSchema }))
	.handler(({ context, data }) =>
		addChapterInDb(db, { ...data, actorUserId: context.userId }),
	);

export const addVerse = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.enter")])
	.validator(chapterAddressSchema)
	.handler(({ context, data }) =>
		addVerseInDb(db, { ...data, actorUserId: context.userId }),
	);

export const removeLastVerse = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.enter")])
	.validator(chapterAddressSchema.extend({ verse: verseSchema }))
	.handler(({ context, data }) =>
		removeLastVerseInDb(db, { ...data, actorUserId: context.userId }),
	);

export const removeLastChapter = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.enter")])
	.validator(chapterAddressSchema)
	.handler(({ context, data }) =>
		removeLastChapterInDb(db, { ...data, actorUserId: context.userId }),
	);

export const saveVerseDrafts = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.enter")])
	.validator(
		chapterAddressSchema.extend({
			addMissingVerses: z.boolean().optional(),
			verses: z
				.array(
					z.object({
						baseText: verseTextSchema,
						number: verseSchema,
						text: verseTextSchema,
					}),
				)
				.max(HIGHEST_VERSE_NUMBER),
		}),
	)
	.handler(({ context, data }) =>
		saveVerseDraftsInDb(db, { ...data, actorUserId: context.userId }),
	);

export const sendChapterForProofreading = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.enter")])
	.validator(chapterAddressSchema)
	.handler(({ context, data }) =>
		sendChapterForProofreadingInDb(db, {
			...data,
			actorUserId: context.userId,
		}),
	);

export const proposeVerseCorrection = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.enter")])
	.validator(
		chapterAddressSchema.extend({
			checkedAgainst: z.string().trim().max(200),
			reason: z.string().trim().min(1).max(1000),
			text: verseTextSchema,
			verse: verseSchema,
		}),
	)
	.handler(({ context, data }) =>
		proposeVerseCorrectionInDb(db, { ...data, actorUserId: context.userId }),
	);

export const getVerseAcrossTranslations = createServerFn({ method: "GET" })
	.middleware([requirePermission(...verseTextReaderPermissions)])
	.validator(
		z.object({
			chapter: chapterSchema,
			slug: slugSchema,
			verse: verseSchema,
		}),
	)
	.handler(({ context, data }) =>
		getVerseAcrossTranslationsFromDb(db, data, context.userId),
	);
