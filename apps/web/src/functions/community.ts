import { db } from "@berean-study/db";
import {
	communityFeedViews,
	listCommunityFeed as listCommunityFeedFromDb,
	listCommunityPublishingResources as listCommunityPublishingResourcesFromDb,
	listSavedCommunityPosts as listSavedCommunityPostsFromDb,
	publishCommunityPost as publishCommunityPostInDb,
	publishVersePost as publishVersePostInDb,
	setCommunityPostBookmark as setCommunityPostBookmarkInDb,
} from "@berean-study/db/community";
import {
	getPostingRestrictionEnd,
	reportCommunityPost as reportCommunityPostInDb,
} from "@berean-study/db/community-moderation";
import { reportReasonKeys } from "@berean-study/db/community-moderation-catalogue";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware, requirePermission } from "@/middleware/auth";

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
			view: z.enum(communityFeedViews).default("featured"),
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

export const listSavedCommunityPosts = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ limit: z.number().int().min(1).max(10).default(2) }))
	.handler(({ context, data }) =>
		listSavedCommunityPostsFromDb(
			db,
			requireUserId(context.session),
			data.limit,
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
	.middleware([requirePermission("community.post")])
	.validator(
		z.object({
			sourceId: z.number().int().positive(),
			snapshot: z
				.object({
					excerpt: z.string().trim().min(1).max(500),
					title: z.string().trim().min(1).max(200),
				})
				.optional(),
			type: z.enum(["collection", "note", "testimony", "prayer"]),
		}),
	)
	.handler(({ context, data }) =>
		publishCommunityPostInDb(db, context.userId, data),
	);

/** When the signed-in person can share again, so the share page can say so up front. */
export const getMyPostingRestriction = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		getPostingRestrictionEnd(db, requireUserId(context.session)),
	);

export const reportCommunityPost = createServerFn({ method: "POST" })
	.middleware([requirePermission("community.post")])
	.validator(
		z.object({
			details: z.string().trim().max(1000).optional(),
			postId: z.number().int().positive(),
			reason: z.enum(reportReasonKeys),
		}),
	)
	.handler(({ context, data }) =>
		reportCommunityPostInDb(db, { ...data, reporterUserId: context.userId }),
	);

/**
 * Shares Bible verses with Community, with an optional thought. The words are
 * looked up from published text on the server, never taken from the browser.
 */
export const publishVersePost = createServerFn({ method: "POST" })
	.middleware([requirePermission("community.post")])
	.validator(
		z.object({
			bookSlug: z
				.string()
				.trim()
				.regex(/^[a-z0-9-]+$/)
				.max(60),
			chapter: z.number().int().positive().max(200),
			thought: z.string().max(500),
			translationAbbreviation: z.string().trim().min(1).max(20),
			verses: z.array(z.number().int().positive().max(200)).min(1).max(200),
		}),
	)
	.handler(({ context, data }) =>
		publishVersePostInDb(db, context.userId, data),
	);
