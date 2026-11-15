import { db } from "@berean-study/db";
import {
	listSavedItems,
	removeSavedItem as removeSavedItemFromDb,
	type SavedItemRemoval,
} from "@berean-study/db/saved-items";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware, requireUserId } from "@/middleware/auth";

export const getSavedItems = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		const userId = requireUserId(context.session);
		return listSavedItems(db, userId);
	});

const removeSavedItemInput = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("scripture"),
		passageId: z.number().int().positive(),
	}),
	z.object({
		highlightId: z.number().int().positive(),
		kind: z.literal("highlight"),
	}),
	z.object({
		kind: z.literal("community"),
		postId: z.number().int().positive(),
	}),
]);

export type { SavedItemRemoval } from "@berean-study/db/saved-items";

export const removeSavedItem = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(removeSavedItemInput)
	.handler(async ({ context, data }) => {
		const userId = requireUserId(context.session);
		return removeSavedItemFromDb(db, userId, data satisfies SavedItemRemoval);
	});
