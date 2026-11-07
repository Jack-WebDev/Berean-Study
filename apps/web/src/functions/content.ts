import { db } from "@berean-study/db";
import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { contentIssueTypes } from "@berean-study/db/content-kinds";
import {
	getContentState as getContentStateFromDb,
	getRevisionPage as getRevisionPageFromDb,
	listApprovedContent as listApprovedContentFromDb,
	listAssignments as listAssignmentsFromDb,
	listEditorialQueue as listEditorialQueueFromDb,
	listLiveContent as listLiveContentFromDb,
	listMyWork as listMyWorkFromDb,
	listOpenIssues as listOpenIssuesFromDb,
	listPeopleWith,
	listReviewQueue as listReviewQueueFromDb,
} from "@berean-study/db/content-queues";
import {
	approveRevision as approveRevisionInDb,
	assignReviewer as assignReviewerInDb,
	assignWriter as assignWriterInDb,
	closeIssue as closeIssueInDb,
	discardDraft as discardDraftInDb,
	publishRevision as publishRevisionInDb,
	raiseIssue as raiseIssueInDb,
	recordCheck as recordCheckInDb,
	requestChanges as requestChangesInDb,
	saveDraft as saveDraftInDb,
	startReview as startReviewInDb,
	submitRevision as submitRevisionInDb,
	withdrawLive as withdrawLiveInDb,
} from "@berean-study/db/content-workflow";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

// The engine also checks the exact permission each step needs. These only keep
// everyone else out of the screens and the unpublished wording behind them.
const contentReaders = [
	"content.write",
	"content.revise",
	"editorial.check",
	"editorial.review",
	"editorial.assign",
	"publication.publish",
	"publication.withdraw",
	"issues.manage",
] as const satisfies readonly PermissionKey[];

const scopeSchema = z.object({
	kind: z.enum(["book_overview"]),
	scopeKey: z.string().trim().min(1).max(100),
});
const idSchema = z.number().int().positive();
const revisionSchema = z.object({ revisionId: idSchema });
const assignmentSchema = revisionSchema.extend({
	assigneeUserId: z.string().min(1).max(100),
});

export const getContentState = createServerFn({ method: "GET" })
	.middleware([
		requirePermission(...contentReaders, "scripture.manage", "scripture.enter"),
	])
	.validator(scopeSchema)
	.handler(({ context, data }) =>
		getContentStateFromDb(db, data, context.userId),
	);

export const getRevisionPage = createServerFn({ method: "GET" })
	.middleware([requirePermission(...contentReaders)])
	.validator(z.object({ contentItemId: idSchema, revisionId: idSchema }))
	.handler(({ context, data }) =>
		getRevisionPageFromDb(db, data, context.userId),
	);

export const listEditorialQueue = createServerFn({ method: "GET" })
	.middleware([requirePermission("editorial.assign")])
	.handler(() => listEditorialQueueFromDb(db));

export const listReviewQueue = createServerFn({ method: "GET" })
	.middleware([requirePermission("editorial.review")])
	.handler(({ context }) => listReviewQueueFromDb(db, context.userId));

export const listAssignments = createServerFn({ method: "GET" })
	.middleware([requirePermission("content.write", "editorial.review")])
	.handler(({ context }) => listAssignmentsFromDb(db, context.userId));

export const listMyWork = createServerFn({ method: "GET" })
	.middleware([requirePermission("content.write", "scripture.enter")])
	.handler(({ context }) => listMyWorkFromDb(db, context.userId));

export const listApprovedContent = createServerFn({ method: "GET" })
	.middleware([
		requirePermission("publication.publish", "publication.withdraw"),
	])
	.handler(() => listApprovedContentFromDb(db));

export const listLiveContent = createServerFn({ method: "GET" })
	.middleware([
		requirePermission("publication.publish", "publication.withdraw"),
	])
	.handler(() => listLiveContentFromDb(db));

export const listOpenIssues = createServerFn({ method: "GET" })
	.middleware([requirePermission("issues.manage")])
	.handler(() => listOpenIssuesFromDb(db));

export const listAssignablePeople = createServerFn({ method: "GET" })
	.middleware([requirePermission("editorial.assign")])
	.handler(async () => ({
		reviewers: await listPeopleWith(db, "editorial.review"),
		writers: await listPeopleWith(db, "content.write", "content.revise"),
	}));

export const saveDraft = createServerFn({ method: "POST" })
	.middleware([requirePermission("content.write", "content.revise")])
	.validator(scopeSchema.extend({ body: z.unknown() }))
	.handler(({ context, data }) =>
		saveDraftInDb(db, { ...data, actorUserId: context.userId }),
	);

export const discardDraft = createServerFn({ method: "POST" })
	.middleware([
		requirePermission("content.write", "content.revise", "editorial.assign"),
	])
	.validator(revisionSchema)
	.handler(({ context, data }) =>
		discardDraftInDb(db, { ...data, actorUserId: context.userId }),
	);

export const submitRevision = createServerFn({ method: "POST" })
	.middleware([requirePermission("content.write", "content.revise")])
	.validator(revisionSchema)
	.handler(({ context, data }) =>
		submitRevisionInDb(db, { ...data, actorUserId: context.userId }),
	);

export const startReview = createServerFn({ method: "POST" })
	.middleware([requirePermission("editorial.review")])
	.validator(revisionSchema)
	.handler(({ context, data }) =>
		startReviewInDb(db, { ...data, actorUserId: context.userId }),
	);

export const recordCheck = createServerFn({ method: "POST" })
	.middleware([requirePermission("editorial.check")])
	.validator(
		revisionSchema.extend({
			checklistId: idSchema,
			note: z.string().trim().max(500),
			result: z.enum(["passed", "failed", "not_applicable"]),
		}),
	)
	.handler(({ context, data }) =>
		recordCheckInDb(db, { ...data, actorUserId: context.userId }),
	);

export const approveRevision = createServerFn({ method: "POST" })
	.middleware([requirePermission("editorial.review")])
	.validator(revisionSchema)
	.handler(({ context, data }) =>
		approveRevisionInDb(db, { ...data, actorUserId: context.userId }),
	);

export const requestChanges = createServerFn({ method: "POST" })
	.middleware([requirePermission("editorial.review")])
	.validator(
		revisionSchema.extend({ feedback: z.string().trim().min(1).max(2000) }),
	)
	.handler(({ context, data }) =>
		requestChangesInDb(db, { ...data, actorUserId: context.userId }),
	);

export const publishRevision = createServerFn({ method: "POST" })
	.middleware([requirePermission("publication.publish")])
	.validator(revisionSchema)
	.handler(({ context, data }) =>
		publishRevisionInDb(db, { ...data, actorUserId: context.userId }),
	);

export const withdrawLive = createServerFn({ method: "POST" })
	.middleware([requirePermission("publication.withdraw")])
	.validator(
		z.object({
			contentItemId: idSchema,
			reason: z.string().trim().min(1).max(1000),
		}),
	)
	.handler(({ context, data }) =>
		withdrawLiveInDb(db, { ...data, actorUserId: context.userId }),
	);

export const assignReviewer = createServerFn({ method: "POST" })
	.middleware([requirePermission("editorial.assign")])
	.validator(assignmentSchema)
	.handler(({ context, data }) =>
		assignReviewerInDb(db, { ...data, actorUserId: context.userId }),
	);

export const assignWriter = createServerFn({ method: "POST" })
	.middleware([requirePermission("editorial.assign")])
	.validator(assignmentSchema)
	.handler(({ context, data }) =>
		assignWriterInDb(db, { ...data, actorUserId: context.userId }),
	);

export const raiseIssue = createServerFn({ method: "POST" })
	.middleware([requirePermission("issues.create")])
	.validator(
		revisionSchema.extend({
			description: z.string().trim().min(1).max(2000),
			issueType: z.enum(contentIssueTypes),
		}),
	)
	.handler(({ context, data }) =>
		raiseIssueInDb(db, { ...data, actorUserId: context.userId }),
	);

export const closeIssue = createServerFn({ method: "POST" })
	.middleware([requirePermission("issues.manage")])
	.validator(
		z.object({
			issueId: idSchema,
			outcome: z.enum(["resolved", "dismissed"]),
		}),
	)
	.handler(({ context, data }) =>
		closeIssueInDb(db, { ...data, actorUserId: context.userId }),
	);
