import { db } from "@berean-study/db";
import {
	createReflection as createReflectionInDb,
	deleteReflection as deleteReflectionInDb,
	getReflection as getReflectionFromDb,
	listReflections as listReflectionsFromDb,
	updateReflection as updateReflectionInDb,
} from "@berean-study/db/prayers";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";
import { requireUserId } from "./prayer-journal";
import { richTextDocumentSchema } from "./rich-text";

const id = z.number().int().positive();

const reflectionInputSchema = z.object({
	content: richTextDocumentSchema,
	prayerId: id.nullable().optional(),
	prompt: z.string().trim().min(1).max(300).nullable().optional(),
});

export const listReflections = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ prayerId: id.optional() }))
	.handler(({ context, data }) =>
		listReflectionsFromDb(db, requireUserId(context.session), data),
	);

export const getReflection = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ id }))
	.handler(({ context, data }) =>
		getReflectionFromDb(db, requireUserId(context.session), data.id),
	);

export const createReflection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(reflectionInputSchema)
	.handler(({ context, data }) =>
		createReflectionInDb(db, requireUserId(context.session), data),
	);

export const updateReflection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(reflectionInputSchema.extend({ id }))
	.handler(({ context, data }) =>
		updateReflectionInDb(db, requireUserId(context.session), data),
	);

export const deleteReflection = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ id }))
	.handler(({ context, data }) =>
		deleteReflectionInDb(db, requireUserId(context.session), data.id),
	);
