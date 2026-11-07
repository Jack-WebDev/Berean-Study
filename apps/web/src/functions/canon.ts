import { db } from "@berean-study/db";
import {
	getCanonOverview as getCanonOverviewFromDb,
	proposeCanonOrder as proposeCanonOrderInDb,
	proposeChapterLimits as proposeChapterLimitsInDb,
} from "@berean-study/db/canon-admin";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

const slugSchema = z.string().trim().min(1).max(100);
const reasonSchema = z.string().trim().min(1).max(1000);

export const getCanonOverview = createServerFn({ method: "GET" })
	.middleware([requirePermission("canon.manage", "scripture.manage")])
	.validator(z.object({ slug: slugSchema.optional() }))
	.handler(({ context, data }) =>
		getCanonOverviewFromDb(db, data.slug, context.userId),
	);

export const proposeChapterLimits = createServerFn({ method: "POST" })
	.middleware([requirePermission("canon.manage")])
	.validator(
		z.object({
			canonSlug: slugSchema,
			limits: z
				.array(
					z.object({
						bookSlug: slugSchema,
						limit: z.number().int().positive().max(200),
					}),
				)
				.min(1)
				.max(100),
			reason: reasonSchema,
		}),
	)
	.handler(({ context, data }) =>
		proposeChapterLimitsInDb(db, { ...data, actorUserId: context.userId }),
	);

export const proposeCanonOrder = createServerFn({ method: "POST" })
	.middleware([requirePermission("canon.manage")])
	.validator(
		z.object({
			canonSlug: slugSchema,
			order: z.array(slugSchema).max(100),
			reason: reasonSchema,
		}),
	)
	.handler(({ context, data }) =>
		proposeCanonOrderInDb(db, { ...data, actorUserId: context.userId }),
	);
