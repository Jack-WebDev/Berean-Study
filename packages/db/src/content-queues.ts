import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PermissionKey } from "./access-catalogue";
import { contentKindNamed } from "./content-kind-registry";
import {
	type ContentRevisionStatus,
	openRevisionStatuses,
} from "./content-kinds";
import { type ContentScope, checksFor } from "./content-workflow";
import type { DbExecutor } from "./db-executor";
import { user } from "./schema/auth";
import { citations } from "./schema/citations";
import { contentIssues } from "./schema/content_issues";
import { contentItems } from "./schema/content_items";
import { contentRevisions } from "./schema/content_revisions";
import { editorialAssignments } from "./schema/editorial_assignments";
import { editorialChecks } from "./schema/editorial_checks";
import { editorialReviews } from "./schema/editorial_reviews";
import { publicationHistory } from "./schema/publication_history";
import { holdersOf } from "./two-person";

const reviewable = [
	"submitted",
	"in_review",
] as const satisfies readonly ContentRevisionStatus[];

const reviewerUser = alias(user, "reviewer_user");

/** One row per revision, in the shape every queue shows. */
function revisionRows(client: DbExecutor) {
	return client
		.select({
			author: user.name,
			authorUserId: contentRevisions.createdByUserId,
			contentItemId: contentItems.id,
			kind: contentItems.kind,
			number: contentRevisions.number,
			reviewer: reviewerUser.name,
			revisionId: contentRevisions.id,
			scopeKey: contentItems.scopeKey,
			status: contentRevisions.status,
			submittedAt: contentRevisions.submittedAt,
			title: contentItems.title,
			updatedAt: contentRevisions.updatedAt,
		})
		.from(contentRevisions)
		.innerJoin(
			contentItems,
			eq(contentItems.id, contentRevisions.contentItemId),
		)
		.innerJoin(user, eq(user.id, contentRevisions.createdByUserId))
		.leftJoin(
			reviewerUser,
			eq(reviewerUser.id, contentRevisions.reviewerUserId),
		);
}

function withKindLabel<TRow extends { kind: string }>(rows: TRow[]) {
	return rows.map((row) => ({
		...row,
		kindLabel: contentKindNamed(row.kind).label,
	}));
}

/** What readers see for this content, or null if nothing is live. */
export async function getLiveContent(client: DbExecutor, scope: ContentScope) {
	const [row] = await client
		.select({
			body: contentRevisions.body,
			number: contentRevisions.number,
			publishedAt: contentRevisions.publishedAt,
			revisionId: contentRevisions.id,
		})
		.from(contentItems)
		.innerJoin(
			contentRevisions,
			eq(contentRevisions.id, contentItems.liveRevisionId),
		)
		.where(
			and(
				eq(contentItems.kind, scope.kind),
				eq(contentItems.scopeKey, scope.scopeKey),
			),
		);
	return row ?? null;
}

/** Where a piece of content stands, and what its editor should start from. */
export async function getContentState(
	client: DbExecutor,
	scope: ContentScope,
	viewerUserId: string,
) {
	const kind = contentKindNamed(scope.kind);
	const [item] = await client
		.select()
		.from(contentItems)
		.where(
			and(
				eq(contentItems.kind, scope.kind),
				eq(contentItems.scopeKey, scope.scopeKey),
			),
		);

	const revisions = item
		? await client
				.select({
					authorName: user.name,
					authorUserId: contentRevisions.createdByUserId,
					basedOnRevisionId: contentRevisions.basedOnRevisionId,
					body: contentRevisions.body,
					id: contentRevisions.id,
					number: contentRevisions.number,
					status: contentRevisions.status,
				})
				.from(contentRevisions)
				.innerJoin(user, eq(user.id, contentRevisions.createdByUserId))
				.where(eq(contentRevisions.contentItemId, item.id))
				.orderBy(desc(contentRevisions.number))
		: [];

	const latest = revisions[0];
	const open = revisions.find((revision) =>
		(openRevisionStatuses as readonly string[]).includes(revision.status),
	);
	const live = revisions.find(({ id }) => id === item?.liveRevisionId);
	const sentBack = revisions.find(
		({ id, status }) =>
			status === "changes_requested" &&
			(open ? open.basedOnRevisionId === id : latest?.id === id),
	);
	const [review] = sentBack
		? await client
				.select({ feedback: editorialReviews.feedback })
				.from(editorialReviews)
				.where(
					and(
						eq(editorialReviews.contentRevisionId, sentBack.id),
						eq(editorialReviews.decision, "changes_requested"),
					),
				)
				.orderBy(desc(editorialReviews.createdAt))
				.limit(1)
		: [];

	return {
		body: kind.parse(latest?.body ?? kind.empty),
		canEdit: open
			? open.status === "draft" && open.authorUserId === viewerUserId
			: true,
		contentItemId: item?.id ?? null,
		feedback: review?.feedback ?? null,
		kindLabel: kind.label,
		live: live
			? {
					body: kind.parse(live.body),
					number: live.number,
					revisionId: live.id,
				}
			: null,
		open: open
			? {
					authorName: open.authorName,
					byMe: open.authorUserId === viewerUserId,
					number: open.number,
					revisionId: open.id,
					status: open.status,
				}
			: null,
		title: item?.title ?? (await kind.title(client, scope.scopeKey)),
	};
}

/** Everything the review screen shows for one revision. Returns null if there's no such revision. */
export async function getRevisionPage(
	client: DbExecutor,
	input: { contentItemId: number; revisionId: number },
	viewerUserId: string,
) {
	const [row] = await revisionRows(client).where(
		and(
			eq(contentRevisions.id, input.revisionId),
			eq(contentItems.id, input.contentItemId),
		),
	);
	if (!row) return null;
	const kind = contentKindNamed(row.kind);

	const all = await client
		.select({
			approvedAt: contentRevisions.approvedAt,
			author: user.name,
			basedOnRevisionId: contentRevisions.basedOnRevisionId,
			body: contentRevisions.body,
			createdAt: contentRevisions.createdAt,
			id: contentRevisions.id,
			number: contentRevisions.number,
			publishedAt: contentRevisions.publishedAt,
			status: contentRevisions.status,
			submittedAt: contentRevisions.submittedAt,
		})
		.from(contentRevisions)
		.innerJoin(user, eq(user.id, contentRevisions.createdByUserId))
		.where(eq(contentRevisions.contentItemId, row.contentItemId))
		.orderBy(desc(contentRevisions.number));
	const current = all.find(({ id }) => id === row.revisionId);
	if (!current) return null;

	const [item] = await client
		.select({ liveRevisionId: contentItems.liveRevisionId })
		.from(contentItems)
		.where(eq(contentItems.id, row.contentItemId));
	const live = all.find(({ id }) => id === item?.liveRevisionId) ?? null;

	// Compare with what readers see, or with what this was written from.
	const baseline =
		live && live.id !== current.id
			? live
			: (all.find(({ id }) => id === current.basedOnRevisionId) ?? null);
	const afterFields = kind.fields(current.body);
	const beforeFields = baseline ? kind.fields(baseline.body) : [];

	const checker = alias(user, "checker");
	const results = await client
		.select({
			checkedAt: editorialChecks.checkedAt,
			checkedBy: checker.name,
			checklistId: editorialChecks.editorialChecklistId,
			note: editorialChecks.note,
			result: editorialChecks.result,
		})
		.from(editorialChecks)
		.innerJoin(checker, eq(checker.id, editorialChecks.checkedByUserId))
		.where(eq(editorialChecks.contentRevisionId, current.id));

	const reviewer = alias(user, "reviewer");
	const reviews = await client
		.select({
			createdAt: editorialReviews.createdAt,
			decision: editorialReviews.decision,
			feedback: editorialReviews.feedback,
			reviewer: reviewer.name,
		})
		.from(editorialReviews)
		.innerJoin(reviewer, eq(reviewer.id, editorialReviews.reviewerUserId))
		.where(eq(editorialReviews.contentRevisionId, current.id))
		.orderBy(desc(editorialReviews.createdAt));

	const reporter = alias(user, "reporter");
	const issues = await client
		.select({
			createdAt: contentIssues.createdAt,
			description: contentIssues.description,
			id: contentIssues.id,
			issueType: contentIssues.issueType,
			reportedBy: reporter.name,
			status: contentIssues.status,
		})
		.from(contentIssues)
		.leftJoin(reporter, eq(reporter.id, contentIssues.reportedByUserId))
		.where(eq(contentIssues.contentRevisionId, current.id))
		.orderBy(desc(contentIssues.createdAt));

	const [sources] = await client
		.select({ value: sql<number>`count(*)::int` })
		.from(citations)
		.where(eq(citations.contentRevisionId, current.id));

	const performer = alias(user, "performer");
	const publications = await client
		.select({
			action: publicationHistory.action,
			at: publicationHistory.createdAt,
			by: performer.name,
			number: contentRevisions.number,
			reason: publicationHistory.reason,
		})
		.from(publicationHistory)
		.innerJoin(
			contentRevisions,
			eq(contentRevisions.id, publicationHistory.contentRevisionId),
		)
		.innerJoin(
			performer,
			eq(performer.id, publicationHistory.performedByUserId),
		)
		.where(eq(contentRevisions.contentItemId, row.contentItemId))
		.orderBy(desc(publicationHistory.createdAt));

	const checks = (await checksFor(client, row.kind)).map((check) => {
		const result = results.find(({ checklistId }) => checklistId === check.id);
		return {
			checkedAt: result?.checkedAt ?? null,
			checkedBy: result?.checkedBy ?? null,
			id: check.id,
			note: result?.note ?? null,
			requirement: check.requirement,
			result: result?.result ?? null,
		};
	});

	return {
		approvedAt: current.approvedAt,
		baselineNumber: baseline?.number ?? null,
		body: kind.parse(current.body),
		changes: afterFields.map(({ label, text }) => ({
			after: text,
			before: beforeFields.find((field) => field.label === label)?.text ?? "",
			label,
		})),
		checks,
		citationCount: sources?.value ?? 0,
		contentItemId: row.contentItemId,
		createdAt: current.createdAt,
		fields: afterFields,
		isAuthor: row.authorUserId === viewerUserId,
		issues,
		kind: row.kind,
		kindLabel: kind.label,
		scopeKey: row.scopeKey,
		liveRevision: live
			? {
					id: live.id,
					number: live.number,
					publishedAt: live.publishedAt,
				}
			: null,
		publications,
		revision: {
			author: row.author,
			id: row.revisionId,
			number: row.number,
			reviewer: row.reviewer,
			status: row.status,
			submittedAt: row.submittedAt,
		},
		revisions: all.map(({ author, createdAt, id, number, status }) => ({
			author,
			createdAt,
			id,
			number,
			status,
		})),
		reviews,
		title: row.title,
	};
}

/** Submitted work waiting for a reviewer, oldest first. Your own isn't yours to review. */
export async function listReviewQueue(
	client: DbExecutor,
	viewerUserId: string,
) {
	return withKindLabel(
		await revisionRows(client)
			.where(
				and(
					inArray(contentRevisions.status, [...reviewable]),
					ne(contentRevisions.createdByUserId, viewerUserId),
				),
			)
			.orderBy(asc(contentRevisions.submittedAt)),
	);
}

/** All content on its way to readers, for whoever runs the editorial queue. */
export async function listEditorialQueue(client: DbExecutor) {
	return withKindLabel(
		await revisionRows(client)
			.where(inArray(contentRevisions.status, [...openRevisionStatuses]))
			.orderBy(asc(contentRevisions.updatedAt)),
	);
}

export async function listApprovedContent(client: DbExecutor) {
	return withKindLabel(
		await revisionRows(client)
			.where(eq(contentRevisions.status, "approved"))
			.orderBy(asc(contentRevisions.approvedAt)),
	);
}

/** Content readers can see now, for withdrawing. */
export async function listLiveContent(client: DbExecutor) {
	return withKindLabel(
		await revisionRows(client)
			.where(eq(contentRevisions.status, "published"))
			.orderBy(desc(contentRevisions.publishedAt)),
	);
}

/** What's been asked of this person and is still open. */
export async function listAssignments(
	client: DbExecutor,
	viewerUserId: string,
) {
	const assignments = await client
		.select({
			revisionId: editorialAssignments.contentRevisionId,
			role: editorialAssignments.role,
		})
		.from(editorialAssignments)
		.where(eq(editorialAssignments.assigneeUserId, viewerUserId))
		.orderBy(asc(editorialAssignments.assignedAt));
	if (assignments.length === 0) return [];

	const rows = await revisionRows(client).where(
		inArray(
			contentRevisions.id,
			assignments.map(({ revisionId }) => revisionId),
		),
	);
	return withKindLabel(
		assignments.flatMap(({ revisionId, role }) => {
			const row = rows.find((candidate) => candidate.revisionId === revisionId);
			if (!row) return [];
			const stillOpen =
				role === "writer"
					? row.status === "draft" && row.authorUserId === viewerUserId
					: (reviewable as readonly string[]).includes(row.status);
			return stillOpen ? [{ ...row, role }] : [];
		}),
	);
}

const myWorkOrder: Partial<Record<ContentRevisionStatus, number>> = {
	changes_requested: 0,
	draft: 1,
	submitted: 2,
	in_review: 3,
	approved: 4,
};

/** This person's writing still in progress, with what needs them first. */
export async function listMyWork(client: DbExecutor, viewerUserId: string) {
	const rows = await revisionRows(client).where(
		and(
			eq(contentRevisions.createdByUserId, viewerUserId),
			inArray(contentRevisions.status, [
				...openRevisionStatuses,
				"changes_requested",
			]),
		),
	);
	const newest = await client
		.select({
			contentItemId: contentRevisions.contentItemId,
			number: sql<number>`max(${contentRevisions.number})::int`,
		})
		.from(contentRevisions)
		.groupBy(contentRevisions.contentItemId);

	return withKindLabel(
		rows
			// A sent-back revision stops being work once a newer one has replaced it.
			.filter(
				(row) =>
					row.status !== "changes_requested" ||
					newest.find(
						({ contentItemId }) => contentItemId === row.contentItemId,
					)?.number === row.number,
			)
			.sort(
				(a, b) =>
					(myWorkOrder[a.status] ?? 9) - (myWorkOrder[b.status] ?? 9) ||
					b.updatedAt.getTime() - a.updatedAt.getTime(),
			),
	);
}

/** Open issues, oldest first. */
export async function listOpenIssues(client: DbExecutor) {
	const reporter = alias(user, "reporter");
	return client
		.select({
			contentItemId: contentItems.id,
			createdAt: contentIssues.createdAt,
			description: contentIssues.description,
			id: contentIssues.id,
			issueType: contentIssues.issueType,
			number: contentRevisions.number,
			reportedBy: reporter.name,
			revisionId: contentRevisions.id,
			title: contentItems.title,
		})
		.from(contentIssues)
		.innerJoin(
			contentRevisions,
			eq(contentRevisions.id, contentIssues.contentRevisionId),
		)
		.innerJoin(
			contentItems,
			eq(contentItems.id, contentRevisions.contentItemId),
		)
		.leftJoin(reporter, eq(reporter.id, contentIssues.reportedByUserId))
		.where(eq(contentIssues.status, "open"))
		.orderBy(asc(contentIssues.createdAt));
}

/** People who could be given this work. */
export async function listPeopleWith(
	client: DbExecutor,
	...anyOf: PermissionKey[]
) {
	const ids = new Set<string>();
	for (const permission of anyOf) {
		for (const id of await holdersOf(client, permission)) ids.add(id);
	}
	if (ids.size === 0) return [];
	return client
		.select({ id: user.id, name: user.name })
		.from(user)
		.where(inArray(user.id, [...ids]))
		.orderBy(asc(user.name));
}
