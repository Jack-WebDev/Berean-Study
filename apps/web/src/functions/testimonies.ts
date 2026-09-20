import { createDb } from "@berean-study/db";
import {
	createTestimony as createTestimonyInDb,
	getTestimony as getTestimonyFromDb,
	listTestimonies as listTestimoniesFromDb,
	shareTestimony as shareTestimonyInDb,
	updateTestimony as updateTestimonyInDb,
} from "@berean-study/db/testimonies";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/middleware/auth";

export const listTestimonies = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");
		return listTestimoniesFromDb(createDb(), context.session.user.id);
	});

export const createTestimony = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			content: z.string().trim().min(1).max(100_000),
			title: z.string().trim().min(1).max(200),
		}),
	)
	.handler(({ context, data }) => {
		if (!context.session) throw new Error("Unauthorized");
		return createTestimonyInDb(createDb(), context.session.user.id, data);
	});

const testimonyInput = z.object({
	content: z.string().trim().min(1).max(100_000),
	title: z.string().trim().min(1).max(200),
});
const testimonyId = z.object({ id: z.number().int().positive() });
export const getTestimony = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(testimonyId)
	.handler(({ context, data }) => {
		if (!context.session) throw new Error("Unauthorized");
		return getTestimonyFromDb(createDb(), context.session.user.id, data.id);
	});
export const updateTestimony = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(testimonyInput.extend({ id: z.number().int().positive() }))
	.handler(({ context, data }) => {
		if (!context.session) throw new Error("Unauthorized");
		return updateTestimonyInDb(createDb(), context.session.user.id, data);
	});
export const shareTestimony = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(testimonyId)
	.handler(({ context, data }) => {
		if (!context.session) throw new Error("Unauthorized");
		return shareTestimonyInDb(createDb(), context.session.user.id, data.id);
	});
