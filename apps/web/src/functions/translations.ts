import { db } from "@berean-study/db";
import {
	getTranslationsOverview as getTranslationsOverviewFromDb,
	recordTranslationPermission as recordTranslationPermissionInDb,
	removeTranslationPermission as removeTranslationPermissionInDb,
	updateTranslationDetails as updateTranslationDetailsInDb,
} from "@berean-study/db/translations-admin";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

const abbreviationSchema = z.string().trim().min(1).max(10);

export const getTranslationsOverview = createServerFn({ method: "GET" })
	.middleware([requirePermission("translations.manage")])
	.validator(z.object({ abbreviation: abbreviationSchema.optional() }))
	.handler(({ data }) => getTranslationsOverviewFromDb(db, data.abbreviation));

export const updateTranslationDetails = createServerFn({ method: "POST" })
	.middleware([requirePermission("translations.manage")])
	.validator(
		z.object({
			abbreviation: abbreviationSchema,
			name: z.string().trim().min(1).max(120),
			edition: z.string().trim().max(120),
			rightsHolder: z.string().trim().max(200),
			copyrightNotice: z.string().trim().max(2000),
		}),
	)
	.handler(({ context, data }) =>
		updateTranslationDetailsInDb(db, { ...data, actorUserId: context.userId }),
	);

export const recordTranslationPermission = createServerFn({ method: "POST" })
	.middleware([requirePermission("translations.manage")])
	.validator(
		z.object({
			abbreviation: abbreviationSchema,
			rightsHolder: z.string().trim().min(1).max(200),
			copyrightNotice: z.string().trim().min(1).max(2000),
			licenceEndsOn: z.iso.date().nullable(),
			quotationLimits: z.string().trim().max(1000),
			reason: z.string().trim().min(1).max(1000),
		}),
	)
	.handler(({ context, data }) =>
		recordTranslationPermissionInDb(db, {
			...data,
			actorUserId: context.userId,
		}),
	);

export const removeTranslationPermission = createServerFn({ method: "POST" })
	.middleware([requirePermission("translations.manage")])
	.validator(
		z.object({
			abbreviation: abbreviationSchema,
			reason: z.string().trim().min(1).max(1000),
		}),
	)
	.handler(({ context, data }) =>
		removeTranslationPermissionInDb(db, {
			...data,
			actorUserId: context.userId,
		}),
	);
