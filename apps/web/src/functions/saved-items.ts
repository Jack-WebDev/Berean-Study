import { db } from "@berean-study/db";
import {
	listSavedItems,
	removeSavedItem as removeSavedItemFromDb,
	type SavedItemRemoval,
} from "@berean-study/db/saved-items";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

export const getSavedItems = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");

		return listSavedItems(db, context.session.user.id);
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
		if (!context.session) throw new Error("Unauthorized");

		return removeSavedItemFromDb(
			db,
			context.session.user.id,
			data satisfies SavedItemRemoval,
		);
	});
