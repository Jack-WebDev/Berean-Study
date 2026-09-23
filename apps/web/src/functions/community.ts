import { db } from "@berean-study/db";
import {
	listCommunityFeed as listCommunityFeedFromDb,
	setCommunityPostBookmark as setCommunityPostBookmarkInDb,
} from "@berean-study/db/community";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

function requireUserId(session: { user: { id: string } } | null) {
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const getCommunityFeed = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listCommunityFeedFromDb(db, requireUserId(context.session)),
	);

export const setCommunityPostBookmark = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			isBookmarked: z.boolean(),
			postId: z.number().int().positive(),
		}),
	)
	.handler(({ context, data }) =>
		setCommunityPostBookmarkInDb(
			db,
			requireUserId(context.session),
			data.postId,
			data.isBookmarked,
		),
	);
