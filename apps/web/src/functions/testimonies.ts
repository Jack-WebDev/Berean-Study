import { db } from "@berean-study/db";
import {
	createTestimony as createTestimonyInDb,
	deleteTestimony as deleteTestimonyInDb,
	getTestimony as getTestimonyFromDb,
	listTestimonies as listTestimoniesFromDb,
	updateTestimony as updateTestimonyInDb,
} from "@berean-study/db/testimonies";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";
import { requireUserId } from "./prayer-journal";
import { richTextDocumentSchema } from "./rich-text";

const testimonyId = z.number().int().positive();

const testimonyInput = z.object({
	content: richTextDocumentSchema,
	/** The month it happened, stored as its first day ("2026-10-01"). */
	happenedOn: z
		.string()
		.regex(/^\d{4}-(0[1-9]|1[0-2])-01$/)
		.nullable()
		.optional(),
	title: z.string().trim().min(1).max(200),
});

export const listTestimonies = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listTestimoniesFromDb(db, requireUserId(context.session)),
	);

export const getTestimony = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ id: testimonyId }))
	.handler(({ context, data }) =>
		getTestimonyFromDb(db, requireUserId(context.session), data.id),
	);

export const createTestimony = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(testimonyInput)
	.handler(({ context, data }) =>
		createTestimonyInDb(db, requireUserId(context.session), data),
	);

export const updateTestimony = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(testimonyInput.extend({ id: testimonyId }))
	.handler(({ context, data }) =>
		updateTestimonyInDb(db, requireUserId(context.session), data),
	);

export const deleteTestimony = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id: testimonyId }))
	.handler(({ context, data }) =>
		deleteTestimonyInDb(db, requireUserId(context.session), data.id),
	);
