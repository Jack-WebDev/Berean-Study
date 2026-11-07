import { db } from "@berean-study/db";
import {
	decideReport as decideReportInDb,
	getReportedPost as getReportedPostFromDb,
	liftPostingRestriction as liftPostingRestrictionInDb,
	listOpenReports as listOpenReportsFromDb,
	listRemovedPosts as listRemovedPostsFromDb,
	restoreCommunityPost as restoreCommunityPostInDb,
} from "@berean-study/db/community-moderation";
import {
	communityRuleKeys,
	moderationDecisions,
} from "@berean-study/db/community-moderation-catalogue";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

const postIdSchema = z.number().int().positive();

export const listOpenReports = createServerFn({ method: "GET" })
	.middleware([requirePermission("community.moderate")])
	.handler(() => listOpenReportsFromDb(db));

export const getReportedPost = createServerFn({ method: "GET" })
	.middleware([requirePermission("community.moderate")])
	.validator(z.object({ postId: postIdSchema }))
	.handler(({ context, data }) =>
		getReportedPostFromDb(db, {
			postId: data.postId,
			viewerUserId: context.userId,
		}),
	);

export const listRemovedPosts = createServerFn({ method: "GET" })
	.middleware([requirePermission("community.moderate")])
	.validator(z.object({ page: z.number().int().positive() }))
	.handler(({ data }) => listRemovedPostsFromDb(db, data));

export const decideReport = createServerFn({ method: "POST" })
	.middleware([requirePermission("community.moderate")])
	.validator(
		z.object({
			decision: z.enum(moderationDecisions),
			note: z.string().trim().max(1000).optional(),
			postId: postIdSchema,
			ruleKey: z.enum(communityRuleKeys).optional(),
		}),
	)
	.handler(({ context, data }) =>
		decideReportInDb(db, { ...data, moderatorUserId: context.userId }),
	);

export const restoreCommunityPost = createServerFn({ method: "POST" })
	.middleware([requirePermission("community.moderate")])
	.validator(
		z.object({
			note: z.string().trim().min(1).max(1000),
			postId: postIdSchema,
		}),
	)
	.handler(({ context, data }) =>
		restoreCommunityPostInDb(db, { ...data, moderatorUserId: context.userId }),
	);

export const liftPostingRestriction = createServerFn({ method: "POST" })
	.middleware([requirePermission("community.moderate")])
	.validator(
		z.object({
			reason: z.string().trim().min(1).max(1000),
			targetUserId: z.string().min(1),
		}),
	)
	.handler(({ context, data }) =>
		liftPostingRestrictionInDb(db, {
			...data,
			moderatorUserId: context.userId,
		}),
	);
