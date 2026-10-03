import { db } from "@berean-study/db";
import {
	listSavedCommunityPosts,
	setCommunityPostBookmark,
} from "@berean-study/db/community";
import {
	listSavedItems as listSavedItemsFromDb,
	removeSavedBookmark,
	removeSavedHighlight,
} from "@berean-study/db/saved-items";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

export const getSavedItems = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");

		return Promise.all([
			listSavedItemsFromDb(db, context.session.user.id),
			listSavedCommunityPosts(db, context.session.user.id),
		]).then(([savedItems, communityBookmarks]) => ({
			communityBookmarks,
			savedItems,
		}));
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

export const removeSavedItem = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(removeSavedItemInput)
	.handler(async ({ context, data }) => {
		if (!context.session) throw new Error("Unauthorized");

		switch (data.kind) {
			case "scripture":
				return removeSavedBookmark(db, context.session.user.id, data.passageId);
			case "highlight":
				return removeSavedHighlight(
					db,
					context.session.user.id,
					data.highlightId,
				);
			case "community":
				return setCommunityPostBookmark(
					db,
					context.session.user.id,
					data.postId,
					false,
				);
		}
	});
