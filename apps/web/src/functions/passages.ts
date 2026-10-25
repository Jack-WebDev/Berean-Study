import { db } from "@berean-study/db";
import {
	getPassageOptions as getPassageOptionsFromDb,
	getPassageStudyContext as getPassageStudyContextFromDb,
	getPassageText as getPassageTextFromDb,
	getPreferredTranslation as getPreferredTranslationFromDb,
	getVerseRangeText as getVerseRangeTextFromDb,
	listTranslations as listTranslationsFromDb,
} from "@berean-study/db/passages";
import { listRecentPassages as listRecentPassagesFromDb } from "@berean-study/db/reader-home";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

export const getPassageOptions = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");
		return getPassageOptionsFromDb(db);
	});

export const getPassageStudyContext = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ passageId: z.number().int().positive() }))
	.handler(({ context, data }) => {
		if (!context.session) throw new Error("Unauthorized");
		return getPassageStudyContextFromDb(db, data.passageId);
	});

export const listTranslations = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");
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
		if (!context.session) throw new Error("Unauthorized");
		const translationId =
			data.translationId ??
			(await getPreferredTranslationFromDb(db, context.session.user.id))?.id;
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
		if (!context.session) throw new Error("Unauthorized");
		return getVerseRangeTextFromDb(db, data);
	});

export const getPreferredTranslation = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");
		return getPreferredTranslationFromDb(db, context.session.user.id);
	});

/** The member's three most recently read passages, newest first. */
export const listRecentPassages = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		if (!context.session) throw new Error("Unauthorized");
		const recent = await listRecentPassagesFromDb(
			db,
			context.session.user.id,
			10,
		);
		// Reading history records every visit, so keep each passage's latest.
		const unique = recent.filter(
			(passage, index) =>
				recent.findIndex((other) => other.passageId === passage.passageId) ===
				index,
		);
		return unique.slice(0, 3).map((passage) => ({
			id: passage.passageId,
			label: passage.title ?? passage.bookName,
		}));
	});
