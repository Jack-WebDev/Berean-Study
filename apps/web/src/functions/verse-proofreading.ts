import { db } from "@berean-study/db";
import {
	getProofreadingChapter as getProofreadingChapterFromDb,
	listChaptersReadyToPublish as listChaptersReadyToPublishFromDb,
	listProofreadingQueue as listProofreadingQueueFromDb,
	markVerse as markVerseInDb,
	passChapter as passChapterInDb,
	publishChapter as publishChapterInDb,
	reopenChapter as reopenChapterInDb,
	sendBackVerses as sendBackVersesInDb,
} from "@berean-study/db/verse-proofreading";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

const chapterAddressSchema = z.object({
	abbreviation: z.string().trim().min(1).max(10),
	chapter: z.number().int().positive().max(200),
	slug: z.string().trim().min(1).max(100),
});

export const listProofreadingQueue = createServerFn({ method: "GET" })
	.middleware([requirePermission("scripture.enter", "scripture.proofread")])
	.handler(({ context }) => listProofreadingQueueFromDb(db, context.userId));

export const listChaptersReadyToPublish = createServerFn({ method: "GET" })
	.middleware([
		requirePermission("publication.publish", "publication.withdraw"),
	])
	.handler(() => listChaptersReadyToPublishFromDb(db));

export const getProofreadingChapter = createServerFn({ method: "GET" })
	.middleware([requirePermission("scripture.proofread", "publication.publish")])
	.validator(chapterAddressSchema)
	.handler(({ context, data }) =>
		getProofreadingChapterFromDb(db, data, context.userId),
	);

export const markVerse = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.proofread")])
	.validator(
		chapterAddressSchema.extend({
			result: z.discriminatedUnion("mark", [
				z.object({ mark: z.literal("matches") }),
				z.object({
					mark: z.literal("needs_fix"),
					note: z.string().trim().max(500),
					suggestedText: z.string().max(4000),
				}),
				z.object({ mark: z.null() }),
			]),
			verse: z.number().int().positive().max(176),
		}),
	)
	.handler(({ context, data }) =>
		markVerseInDb(db, { ...data, actorUserId: context.userId }),
	);

export const sendBackVerses = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.proofread")])
	.validator(chapterAddressSchema)
	.handler(({ context, data }) =>
		sendBackVersesInDb(db, { ...data, actorUserId: context.userId }),
	);

export const passChapter = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.proofread")])
	.validator(chapterAddressSchema.extend({ publish: z.boolean() }))
	.handler(({ context, data }) => {
		if (
			data.publish &&
			!context.permissionKeys.includes("publication.publish")
		) {
			throw new Error("You don't have permission to do this.");
		}
		return passChapterInDb(db, { ...data, actorUserId: context.userId });
	});

export const reopenChapter = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.proofread", "publication.publish")])
	.validator(
		chapterAddressSchema.extend({
			reason: z.string().trim().min(1).max(1000),
		}),
	)
	.handler(({ context, data }) =>
		reopenChapterInDb(db, { ...data, actorUserId: context.userId }),
	);

export const publishChapter = createServerFn({ method: "POST" })
	.middleware([requirePermission("publication.publish")])
	.validator(chapterAddressSchema)
	.handler(({ context, data }) =>
		publishChapterInDb(db, { ...data, actorUserId: context.userId }),
	);
