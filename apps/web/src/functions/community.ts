import { db } from "@berean-study/db";
import {
	listCommunityFeed as listCommunityFeedFromDb,
	listCommunityPublishingResources as listCommunityPublishingResourcesFromDb,
	publishCommunityPost as publishCommunityPostInDb,
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
	.validator(
		z.object({
			page: z.number().int().positive().default(1),
			pageSize: z.number().int().min(1).max(50).default(12),
		}),
	)
	.handler(({ context, data }) =>
		listCommunityFeedFromDb(db, requireUserId(context.session), data),
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

export const listCommunityPublishingResources = createServerFn({
	method: "GET",
})
	.middleware([authMiddleware])
	.handler(({ context }) =>
		listCommunityPublishingResourcesFromDb(db, requireUserId(context.session)),
	);

export const publishCommunityPost = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			excerpt: z.string().trim().min(1).max(500),
			sourceId: z.number().int().positive(),
			title: z.string().trim().min(1).max(200),
			type: z.enum(["collection", "note", "testimony", "prayer"]),
		}),
	)
	.handler(({ context, data }) =>
		publishCommunityPostInDb(db, requireUserId(context.session), data),
	);
