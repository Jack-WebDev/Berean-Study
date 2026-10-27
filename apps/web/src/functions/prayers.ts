import { db } from "@berean-study/db";
import {
	addPrayerUpdate as addPrayerUpdateInDb,
	createPrayer as createPrayerInDb,
	deletePrayer as deletePrayerInDb,
	deletePrayerUpdate as deletePrayerUpdateInDb,
	getPrayer as getPrayerFromDb,
	listPrayers as listPrayersFromDb,
	listPrayersReadyForReflection as listPrayersReadyForReflectionFromDb,
	updatePrayer as updatePrayerInDb,
} from "@berean-study/db/prayers";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";
import { requireUserId } from "./prayer-journal";
import { richTextDocumentSchema } from "./rich-text";

const prayerId = z.number().int().positive();

const prayerInputSchema = z.object({
	category: z.string().trim().min(1).max(50).nullable().optional(),
	content: richTextDocumentSchema,
	prayingFor: z.string().trim().min(1).max(120).nullable().optional(),
	title: z.string().trim().min(1).max(200),
});

export const listPrayers = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listPrayersFromDb(db, requireUserId(context.session)),
	);

export const getPrayer = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ id: prayerId }))
	.handler(({ context, data }) =>
		getPrayerFromDb(db, requireUserId(context.session), data.id),
	);

export const createPrayer = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(prayerInputSchema)
	.handler(({ context, data }) =>
		createPrayerInDb(db, requireUserId(context.session), data),
	);

export const updatePrayer = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(prayerInputSchema.extend({ id: prayerId }))
	.handler(({ context, data }) =>
		updatePrayerInDb(db, requireUserId(context.session), data),
	);

export const deletePrayer = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: prayerId }))
	.handler(({ context, data }) =>
		deletePrayerInDb(db, requireUserId(context.session), data.id),
	);

export const addPrayerUpdate = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ prayerId, text: z.string().trim().min(1).max(1000) }))
	.handler(({ context, data }) =>
		addPrayerUpdateInDb(db, requireUserId(context.session), data),
	);

export const deletePrayerUpdate = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: z.number().int().positive(), prayerId }))
	.handler(({ context, data }) =>
		deletePrayerUpdateInDb(db, requireUserId(context.session), data),
	);

export const listPrayersReadyForReflection = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listPrayersReadyForReflectionFromDb(db, requireUserId(context.session)),
	);
