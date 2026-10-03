import { db } from "@berean-study/db";
import {
	createPrayer as createPrayerInDb,
	createPrayerReflection as createPrayerReflectionInDb,
	deletePrayerReflection as deletePrayerReflectionInDb,
	getPrayer as getPrayerFromDb,
	getPrayerReflection as getPrayerReflectionFromDb,
	listLibraryReflections as listLibraryReflectionsFromDb,
	listPrayers as listPrayersFromDb,
	updatePrayer as updatePrayerInDb,
	updatePrayerReflection as updatePrayerReflectionInDb,
} from "@berean-study/db/prayers";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

const prayerInputSchema = z.object({
	category: z.string().trim().min(1).max(50).nullable().optional(),
	content: z.string().trim().min(1).max(100_000),
	passageId: z.number().int().positive().nullable().optional(),
	title: z.string().trim().min(1).max(200),
});

const reflectionInputSchema = z.object({
	content: z.string().trim().min(1).max(100_000),
	prayerId: z.number().int().positive(),
});

function requireUserId(session: { user: { id: string } } | null) {
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const listPrayers = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listPrayersFromDb(db, requireUserId(context.session)),
	);

export const listLibraryReflections = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			category: z.string().trim().min(1).max(50).optional(),
			limit: z.number().int().min(1).max(50).default(20),
			offset: z.number().int().min(0).default(0),
			query: z.string().trim().max(200).optional(),
			sort: z.enum(["oldest", "recent"]).default("recent"),
		}),
	)
	.handler(({ context, data }) =>
		listLibraryReflectionsFromDb(db, requireUserId(context.session), data),
	);

export const createPrayer = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(prayerInputSchema)
	.handler(({ context, data }) =>
		createPrayerInDb(db, requireUserId(context.session), data),
	);

export const getPrayer = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ id: z.number().int().positive() }))
	.handler(({ context, data }) =>
		getPrayerFromDb(db, requireUserId(context.session), data.id),
	);

export const updatePrayer = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(prayerInputSchema.extend({ id: z.number().int().positive() }))
	.handler(({ context, data }) =>
		updatePrayerInDb(db, requireUserId(context.session), data),
	);

export const getPrayerReflection = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(
		reflectionInputSchema.pick({ prayerId: true }).extend({
			reflectionId: z.number().int().positive(),
		}),
	)
	.handler(({ context, data }) =>
		getPrayerReflectionFromDb(
			db,
			requireUserId(context.session),
			data.prayerId,
			data.reflectionId,
		),
	);

export const createPrayerReflection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(reflectionInputSchema)
	.handler(({ context, data }) =>
		createPrayerReflectionInDb(db, requireUserId(context.session), data),
	);

export const updatePrayerReflection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		reflectionInputSchema.extend({ reflectionId: z.number().int().positive() }),
	)
	.handler(({ context, data }) =>
		updatePrayerReflectionInDb(db, requireUserId(context.session), data),
	);

export const deletePrayerReflection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			prayerId: z.number().int().positive(),
			reflectionId: z.number().int().positive(),
		}),
	)
	.handler(({ context, data }) =>
		deletePrayerReflectionInDb(
			db,
			requireUserId(context.session),
			data.prayerId,
			data.reflectionId,
		),
	);
