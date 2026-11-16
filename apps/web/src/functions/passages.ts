import { db } from "@berean-study/db";
import {
	getPassageOptions as getPassageOptionsFromDb,
	getPassageStudyContext as getPassageStudyContextFromDb,
	getPassageText as getPassageTextFromDb,
	getPreferredTranslation as getPreferredTranslationFromDb,
	getVerseRangeText as getVerseRangeTextFromDb,
	listTranslations as listTranslationsFromDb,
} from "@berean-study/db/passages";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware, requireUserId } from "@/middleware/auth";

export const getPassageOptions = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		requireUserId(context.session);
		return getPassageOptionsFromDb(db);
	});

export const getPassageStudyContext = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ passageId: z.number().int().positive() }))
	.handler(({ context, data }) => {
		requireUserId(context.session);
		return getPassageStudyContextFromDb(db, data.passageId);
	});

export const listTranslations = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		requireUserId(context.session);
		return listTranslationsFromDb(db);
	});

/** Uses the member's preferred translation unless one is requested. */
export const getPassageText = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			passageId: z.number().int().positive(),
			translationId: z.number().int().positive().optional(),
		}),
	)
	.handler(async ({ context, data }) => {
		const userId = requireUserId(context.session);
		const translationId =
			data.translationId ??
			(await getPreferredTranslationFromDb(db, userId))?.id;
		return translationId
			? getPassageTextFromDb(db, data.passageId, translationId)
			: null;
	});

export const getVerseRangeText = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(
		z
			.object({
				bookId: z.number().int().positive(),
				chapter: z.number().int().positive(),
				translation: z.string().trim().min(1).max(20),
				verseEnd: z.number().int().positive(),
				verseStart: z.number().int().positive(),
			})
			.refine((range) => range.verseEnd >= range.verseStart),
	)
	.handler(({ context, data }) => {
		requireUserId(context.session);
		return getVerseRangeTextFromDb(db, data);
	});

export const getPreferredTranslation = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		const userId = requireUserId(context.session);
		return getPreferredTranslationFromDb(db, userId);
	});
