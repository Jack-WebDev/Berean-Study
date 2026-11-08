import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	inArray,
	isNotNull,
	isNull,
	ne,
	notExists,
	sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { recordAudit } from "./audit";
import {
	type CommunityRuleKey,
	communityRuleNamed,
	isModerationAction,
	type ModerationDecision,
	moderationActionLabels,
	POSTING_RESTRICTION_DAYS,
	type ReportReasonKey,
	reportReasonNamed,
} from "./community-moderation-catalogue";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { createNotification } from "./notifications";
import { getPassageExcerpts } from "./passages";
import { user } from "./schema/auth";
import { communityPostPassages } from "./schema/community_post_passages";
import { communityPosts } from "./schema/community_posts";
import { communityReports } from "./schema/community_reports";
import { moderationActions } from "./schema/moderation_actions";
import { postingRestrictions } from "./schema/posting_restrictions";
import { translations } from "./schema/translations";

const REMOVED_PAGE_SIZE = 25;
const DAY_MS = 86_400_000;

const removalActions = ["removed", "removed_and_warned", "restricted"] as const;

/** Only what the author chose to publish. The private note or prayer behind a post is never read. */
function readSnapshot(snapshot: Record<string, unknown>) {
	const text = (value: unknown) =>
		typeof value === "string" && value.trim() ? value.trim() : null;
	return {
		// A shared verse may have no thought of its own; moderators see the verse.
		excerpt:
			text(snapshot.excerpt) ??
			text(snapshot.description) ??
			text(snapshot.verseText) ??
			"",
		title: text(snapshot.title) ?? "Untitled post",
	};
}

export type ReportOutcome =
	| "reported"
	| "already_reported"
	| "own_post"
	| "unavailable"
	| "needs_details";

/** A member flags a post for a moderator. Nothing changes for readers until one decides. */
export async function reportCommunityPost(
	client: DbExecutor,
	input: {
		details?: string;
		postId: number;
		reason: ReportReasonKey;
		reporterUserId: string;
	},
): Promise<ReportOutcome> {
	const details = input.details?.trim() || null;
	if (input.reason === "other" && !details) return "needs_details";

	const [post] = await client
		.select({ authorUserId: communityPosts.authorUserId })
		.from(communityPosts)
		.where(
			and(
				eq(communityPosts.id, input.postId),
				isNull(communityPosts.removedAt),
			),
		);
	if (!post) return "unavailable";
	if (post.authorUserId === input.reporterUserId) return "own_post";

	const inserted = await client
		.insert(communityReports)
		.values({
			communityPostId: input.postId,
			details,
			reason: input.reason,
			reportedByUserId: input.reporterUserId,
		})
		.onConflictDoNothing()
		.returning({ id: communityReports.id });
	return inserted.length > 0 ? "reported" : "already_reported";
}

function activeRestrictionFilter() {
	return and(
		isNull(postingRestrictions.liftedAt),
		gt(postingRestrictions.endsAt, new Date()),
	);
}

/** When this person can share with Community again, or null if they can now. */
export async function getPostingRestrictionEnd(
	client: DbExecutor,
	userId: string,
) {
	const [restriction] = await client
		.select({ endsAt: postingRestrictions.endsAt })
		.from(postingRestrictions)
		.where(
			and(eq(postingRestrictions.userId, userId), activeRestrictionFilter()),
		)
		.orderBy(desc(postingRestrictions.endsAt))
		.limit(1);
	return restriction?.endsAt ?? null;
}

function hasOpenReports() {
	return and(
		isNull(communityReports.resolution),
		// An account deleted while reported leaves a removed, empty post behind.
		isNull(communityPosts.removedAt),
	);
}

/**
 * Posts with open reports waiting on this person. Their own posts and posts they
 * reported are someone else's to decide, so they don't count.
 */
export async function countReportsWaitingOn(
	client: DbExecutor,
	viewerUserId: string,
) {
	const ownReports = alias(communityReports, "own_reports");
	const [result] = await client
		.select({
			value: sql<number>`count(distinct ${communityReports.communityPostId})::int`,
		})
		.from(communityReports)
		.innerJoin(
			communityPosts,
			eq(communityPosts.id, communityReports.communityPostId),
		)
		.where(
			and(
				hasOpenReports(),
				ne(communityPosts.authorUserId, viewerUserId),
				notExists(
					client
						.select({ id: ownReports.id })
						.from(ownReports)
						.where(
							and(
								eq(ownReports.communityPostId, communityPosts.id),
								eq(ownReports.reportedByUserId, viewerUserId),
								isNull(ownReports.resolution),
							),
						),
				),
			),
		);
	return result?.value ?? 0;
}

/** Removals that still stand. A post that was restored doesn't count against its author. */
async function removalsByAuthor(
	client: DbExecutor,
	authorUserIds: readonly string[],
) {
	if (authorUserIds.length === 0) return new Map<string, number>();
	const rows = await client
		.select({
			authorUserId: communityPosts.authorUserId,
			value: count(),
		})
		.from(communityPosts)
		.where(
			and(
				inArray(communityPosts.authorUserId, [...new Set(authorUserIds)]),
				isNotNull(communityPosts.removedAt),
			),
		)
		.groupBy(communityPosts.authorUserId);
	return new Map(rows.map((row) => [row.authorUserId, row.value]));
}

/** One row per reported post, oldest report first, however many people reported it. */
export async function listOpenReports(client: DbExecutor) {
	const rows = await client
		.select({
			authorUserId: communityPosts.authorUserId,
			createdAt: communityReports.createdAt,
			postId: communityPosts.id,
			postType: communityPosts.postType,
			reason: communityReports.reason,
			reportId: communityReports.id,
			snapshot: communityPosts.snapshot,
		})
		.from(communityReports)
		.innerJoin(
			communityPosts,
			eq(communityPosts.id, communityReports.communityPostId),
		)
		.where(hasOpenReports())
		.orderBy(asc(communityReports.createdAt), asc(communityReports.id));

	const removals = await removalsByAuthor(
		client,
		rows.map(({ authorUserId }) => authorUserId),
	);
	const byPost = new Map<
		number,
		{
			authorHasPriorRemoval: boolean;
			oldestAt: Date;
			postId: number;
			postType: string;
			reason: string;
			reasonLabel: string;
			reportCode: string;
			reporters: number;
			title: string;
		}
	>();
	for (const row of rows) {
		const existing = byPost.get(row.postId);
		if (existing) {
			existing.reporters += 1;
			continue;
		}
		byPost.set(row.postId, {
			authorHasPriorRemoval: (removals.get(row.authorUserId) ?? 0) > 0,
			oldestAt: row.createdAt,
			postId: row.postId,
			postType: row.postType,
			reason: row.reason,
			reasonLabel: reportReasonNamed(row.reason)?.label ?? row.reason,
			reportCode: `R-${row.reportId}`,
			reporters: 1,
			title: readSnapshot(row.snapshot).title,
		});
	}
	return [...byPost.values()];
}

/** Everything a moderator needs to decide about one post, with no one's private content. */
export async function getReportedPost(
	client: DbExecutor,
	input: { postId: number; viewerUserId: string },
) {
	const [post] = await client
		.select({
			authorDeletedAt: user.deletedAt,
			authorImage: user.image,
			authorName: user.name,
			authorSince: user.createdAt,
			authorUserId: communityPosts.authorUserId,
			id: communityPosts.id,
			postType: communityPosts.postType,
			publishedAt: communityPosts.publishedAt,
			removedAt: communityPosts.removedAt,
			snapshot: communityPosts.snapshot,
		})
		.from(communityPosts)
		.innerJoin(user, eq(user.id, communityPosts.authorUserId))
		.where(eq(communityPosts.id, input.postId));
	if (!post) return null;

	const reporter = alias(user, "reporter");
	const reports = await client
		.select({
			createdAt: communityReports.createdAt,
			details: communityReports.details,
			id: communityReports.id,
			reason: communityReports.reason,
			reporterName: reporter.name,
			reporterUserId: communityReports.reportedByUserId,
			resolution: communityReports.resolution,
		})
		.from(communityReports)
		.innerJoin(reporter, eq(reporter.id, communityReports.reportedByUserId))
		.where(eq(communityReports.communityPostId, post.id))
		.orderBy(asc(communityReports.createdAt), asc(communityReports.id));
	if (reports.length === 0) return null;

	const moderator = alias(user, "moderator");
	const actions = await client
		.select({
			action: moderationActions.action,
			createdAt: moderationActions.createdAt,
			id: moderationActions.id,
			moderatorName: moderator.name,
			note: moderationActions.note,
			ruleKey: moderationActions.ruleKey,
		})
		.from(moderationActions)
		.innerJoin(moderator, eq(moderator.id, moderationActions.moderatorUserId))
		.where(eq(moderationActions.communityPostId, post.id))
		.orderBy(desc(moderationActions.createdAt), desc(moderationActions.id));

	// Newest decision per post, and only posts still removed: a restored post doesn't count.
	const earlierRemovals = await client
		.selectDistinctOn([moderationActions.communityPostId], {
			createdAt: moderationActions.createdAt,
			id: moderationActions.id,
			ruleKey: moderationActions.ruleKey,
			snapshot: communityPosts.snapshot,
		})
		.from(moderationActions)
		.innerJoin(
			communityPosts,
			eq(communityPosts.id, moderationActions.communityPostId),
		)
		.where(
			and(
				eq(communityPosts.authorUserId, post.authorUserId),
				ne(communityPosts.id, post.id),
				isNotNull(communityPosts.removedAt),
				inArray(moderationActions.action, [...removalActions]),
			),
		)
		.orderBy(
			moderationActions.communityPostId,
			desc(moderationActions.createdAt),
		);

	const open = reports.filter(({ resolution }) => resolution === null);
	const firstOpen = open[0];
	const snapshot = readSnapshot(post.snapshot);
	const isAuthor = post.authorUserId === input.viewerUserId;
	const isReporter = open.some(
		({ reporterUserId }) => reporterUserId === input.viewerUserId,
	);
	const isAuthorDeleted = post.authorDeletedAt !== null;

	return {
		author: {
			earlierRemovals: earlierRemovals.map((removal) => ({
				at: removal.createdAt,
				id: removal.id,
				rule: communityRuleNamed(removal.ruleKey)?.title ?? null,
				title: readSnapshot(removal.snapshot).title,
			})),
			image: post.authorImage,
			isDeleted: isAuthorDeleted,
			memberSince: post.authorSince,
			name: post.authorName,
			restrictedUntil: await getPostingRestrictionEnd(
				client,
				post.authorUserId,
			),
			userId: post.authorUserId,
		},
		// Why this person can't decide, if they can't.
		conflict: isAuthor
			? ("author" as const)
			: isReporter
				? ("reporter" as const)
				: null,
		history: actions.map((action) => ({
			at: action.createdAt,
			id: action.id,
			label: isModerationAction(action.action)
				? moderationActionLabels[action.action]
				: action.action,
			moderatorName: action.moderatorName,
			note: action.note,
			rule: communityRuleNamed(action.ruleKey)?.title ?? null,
		})),
		passages: await passageLabelsFor(client, post.id),
		post: {
			excerpt: snapshot.excerpt,
			id: post.id,
			publishedAt: post.publishedAt,
			removedAt: post.removedAt,
			title: snapshot.title,
			type: post.postType,
		},
		reportCode: `R-${(firstOpen ?? reports[0])?.id}`,
		reports: reports.map((report) => ({
			at: report.createdAt,
			details: report.details,
			id: report.id,
			reasonLabel: reportReasonNamed(report.reason)?.label ?? report.reason,
			reporterName: report.reporterName,
			resolution: report.resolution,
		})),
		isOpen: open.length > 0 && post.removedAt === null,
		// What the first open report points at, so the likely rule is already chosen.
		suggestedRule: firstOpen
			? (reportReasonNamed(firstOpen.reason)?.rule ?? null)
			: null,
		canRestore: post.removedAt !== null && !isAuthorDeleted && !isAuthor,
	};
}

async function passageLabelsFor(client: DbExecutor, postId: number) {
	const linked = await client
		.select({ passageId: communityPostPassages.passageId })
		.from(communityPostPassages)
		.where(eq(communityPostPassages.communityPostId, postId));
	if (linked.length === 0) return [];

	// Any translation gives the numbering a reference needs; no verse text is read.
	const [translation] = await client
		.select({ id: translations.id })
		.from(translations)
		.orderBy(asc(translations.id))
		.limit(1);
	const excerpts = await getPassageExcerpts(
		client,
		linked.map(({ passageId }) => passageId),
		translation?.id ?? null,
		0,
	);
	return [...excerpts.values()].map(({ reference }) => reference);
}

function assertNotConflicted(
	moderatorUserId: string,
	post: { authorUserId: string },
) {
	if (post.authorUserId === moderatorUserId) {
		throw new GovernanceError(
			"This is your own post, so another moderator decides it.",
		);
	}
}

/** Locks the post, so two moderators can't decide the same report at once. */
async function lockPost(tx: DbExecutor, postId: number) {
	const [post] = await tx
		.select({
			authorDeletedAt: user.deletedAt,
			authorUserId: communityPosts.authorUserId,
			removedAt: communityPosts.removedAt,
			snapshot: communityPosts.snapshot,
		})
		.from(communityPosts)
		.innerJoin(user, eq(user.id, communityPosts.authorUserId))
		.where(eq(communityPosts.id, postId))
		.for("update", { of: communityPosts });
	if (!post) throw new GovernanceError("This post no longer exists.");
	return post;
}

function formatNoticeDate(date: Date) {
	return new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(date);
}

function removalNotice(
	decision: Exclude<ModerationDecision, "dismissed">,
	title: string,
	rule: { title: string; description: string },
	restrictedUntil: Date | null,
) {
	const because = `"${title}" was removed from Community because it goes against "${rule.title}": ${rule.description}`;
	switch (decision) {
		case "removed":
			return { title: "A moderator removed your post", body: because };
		case "removed_and_warned":
			return {
				title: "Your post was removed, and this is a warning",
				body: `${because} Further removals may limit your posting.`,
			};
		case "restricted":
			return {
				title: `You can't share with Community for ${POSTING_RESTRICTION_DAYS} days`,
				body: `${because} You can share again from ${restrictedUntil ? formatNoticeDate(restrictedUntil) : "next week"}. You can still read Community.`,
			};
	}
}

/**
 * Settles every open report on a post. Removing keeps the post so it can be
 * restored, and the author is told which rule applied. Dismissing tells no one,
 * because the author was never told about the report.
 */
export async function decideReport(
	client: DbExecutor,
	input: {
		decision: ModerationDecision;
		moderatorUserId: string;
		note?: string;
		postId: number;
		ruleKey?: CommunityRuleKey;
	},
) {
	const note = input.note?.trim() || null;
	const rule = communityRuleNamed(input.ruleKey ?? null);
	if (input.decision !== "dismissed" && !rule) {
		throw new GovernanceError("Choose which rule this post goes against.");
	}
	if (input.decision === "restricted" && !note) {
		throw new GovernanceError("Give a reason for restricting this person.");
	}

	await client.transaction(async (tx) => {
		const post = await lockPost(tx, input.postId);
		assertNotConflicted(input.moderatorUserId, post);

		const open = await tx
			.select({
				id: communityReports.id,
				reporterUserId: communityReports.reportedByUserId,
			})
			.from(communityReports)
			.where(
				and(
					eq(communityReports.communityPostId, input.postId),
					isNull(communityReports.resolution),
				),
			);
		if (open.length === 0 || post.removedAt) {
			throw new GovernanceError("This report has already been decided.");
		}
		if (
			open.some(
				({ reporterUserId }) => reporterUserId === input.moderatorUserId,
			)
		) {
			throw new GovernanceError(
				"You reported this post, so another moderator decides it.",
			);
		}

		const now = new Date();
		await tx
			.update(communityReports)
			.set({
				resolution: input.decision,
				reviewedAt: now,
				reviewedByUserId: input.moderatorUserId,
			})
			.where(
				and(
					eq(communityReports.communityPostId, input.postId),
					isNull(communityReports.resolution),
				),
			);
		await tx.insert(moderationActions).values({
			action: input.decision,
			communityPostId: input.postId,
			moderatorUserId: input.moderatorUserId,
			note,
			ruleKey: rule?.key ?? null,
		});

		const { title } = readSnapshot(post.snapshot);
		const details = {
			name: title,
			reason: note ?? undefined,
			reports: open.length,
			rule: rule?.title,
		};

		if (input.decision === "dismissed") {
			await recordAudit(tx, {
				actorUserId: input.moderatorUserId,
				action: "community_report.dismissed",
				targetType: "community_post",
				targetId: input.postId,
				details,
			});
			return;
		}
		if (!rule) return;

		await tx
			.update(communityPosts)
			.set({ removedAt: now })
			.where(eq(communityPosts.id, input.postId));
		await recordAudit(tx, {
			actorUserId: input.moderatorUserId,
			action: "community_post.removed",
			targetType: "community_post",
			targetId: input.postId,
			details,
		});

		let restrictedUntil: Date | null = null;
		if (input.decision === "removed_and_warned") {
			await recordAudit(tx, {
				actorUserId: input.moderatorUserId,
				action: "user.warned",
				targetType: "user",
				targetId: post.authorUserId,
				details: { reason: note ?? undefined, rule: rule.title },
			});
		}
		if (input.decision === "restricted") {
			restrictedUntil = new Date(
				now.getTime() + POSTING_RESTRICTION_DAYS * DAY_MS,
			);
			await tx.insert(postingRestrictions).values({
				endsAt: restrictedUntil,
				restrictedByUserId: input.moderatorUserId,
				startedAt: now,
				userId: post.authorUserId,
			});
			await recordAudit(tx, {
				actorUserId: input.moderatorUserId,
				action: "user.restricted",
				targetType: "user",
				targetId: post.authorUserId,
				details: {
					days: POSTING_RESTRICTION_DAYS,
					reason: note ?? undefined,
					rule: rule.title,
				},
			});
		}

		await createNotification(tx, {
			...removalNotice(input.decision, title, rule, restrictedUntil),
			destination: `/community/guidelines#${rule.key}`,
			kind: "community_moderation",
			userId: post.authorUserId,
		});
	});
}

/** Puts a removed post back. A deleted author's post is empty, so there is nothing to restore. */
export async function restoreCommunityPost(
	client: DbExecutor,
	input: { moderatorUserId: string; note: string; postId: number },
) {
	const note = input.note.trim();
	if (!note)
		throw new GovernanceError("Give a reason for restoring this post.");

	await client.transaction(async (tx) => {
		const post = await lockPost(tx, input.postId);
		assertNotConflicted(input.moderatorUserId, post);
		if (!post.removedAt) {
			throw new GovernanceError("This post isn't removed.");
		}
		if (post.authorDeletedAt) {
			throw new GovernanceError(
				"The author deleted their account, so this post can't be restored.",
			);
		}

		await tx
			.update(communityPosts)
			.set({ removedAt: null })
			.where(eq(communityPosts.id, input.postId));
		await tx.insert(moderationActions).values({
			action: "restored",
			communityPostId: input.postId,
			moderatorUserId: input.moderatorUserId,
			note,
		});

		const { title } = readSnapshot(post.snapshot);
		await recordAudit(tx, {
			actorUserId: input.moderatorUserId,
			action: "community_post.restored",
			targetType: "community_post",
			targetId: input.postId,
			details: { name: title, reason: note },
		});
		await createNotification(tx, {
			body: `"${title}" is back on Community. A moderator reviewed the removal and restored it.`,
			destination: "/community",
			kind: "community_moderation",
			title: "Your post was restored",
			userId: post.authorUserId,
		});
	});
}

export async function liftPostingRestriction(
	client: DbExecutor,
	input: { moderatorUserId: string; reason: string; targetUserId: string },
) {
	const reason = input.reason.trim();
	if (!reason) throw new GovernanceError("Give a reason for lifting this.");
	if (input.moderatorUserId === input.targetUserId) {
		throw new GovernanceError(
			"This is your own restriction, so another moderator lifts it.",
		);
	}

	await client.transaction(async (tx) => {
		const lifted = await tx
			.update(postingRestrictions)
			.set({ liftedAt: new Date(), liftedByUserId: input.moderatorUserId })
			.where(
				and(
					eq(postingRestrictions.userId, input.targetUserId),
					activeRestrictionFilter(),
				),
			)
			.returning({ id: postingRestrictions.id });
		if (lifted.length === 0) {
			throw new GovernanceError("This person isn't restricted.");
		}
		await recordAudit(tx, {
			actorUserId: input.moderatorUserId,
			action: "user.restriction_lifted",
			targetType: "user",
			targetId: input.targetUserId,
			details: { reason },
		});
		await createNotification(tx, {
			body: "A moderator lifted your restriction, so you can share with Community again.",
			destination: "/community",
			kind: "community_moderation",
			title: "You can share with Community again",
			userId: input.targetUserId,
		});
	});
}

/** Posts a moderator removed, newest first. Empty posts left by deleted accounts aren't listed. */
export async function listRemovedPosts(
	client: DbExecutor,
	input: { page: number },
) {
	const where = and(
		isNotNull(communityPosts.removedAt),
		isNull(user.deletedAt),
	);
	const [totals] = await client
		.select({ value: count() })
		.from(communityPosts)
		.innerJoin(user, eq(user.id, communityPosts.authorUserId))
		.where(where);
	const rows = await client
		.select({
			authorName: user.name,
			postId: communityPosts.id,
			postType: communityPosts.postType,
			removedAt: communityPosts.removedAt,
			snapshot: communityPosts.snapshot,
		})
		.from(communityPosts)
		.innerJoin(user, eq(user.id, communityPosts.authorUserId))
		.where(where)
		.orderBy(desc(communityPosts.removedAt), desc(communityPosts.id))
		.limit(REMOVED_PAGE_SIZE)
		.offset((input.page - 1) * REMOVED_PAGE_SIZE);

	return {
		pageSize: REMOVED_PAGE_SIZE,
		posts: rows.map((row) => ({
			authorName: row.authorName,
			postId: row.postId,
			postType: row.postType,
			removedAt: row.removedAt,
			title: readSnapshot(row.snapshot).title,
		})),
		total: totals?.value ?? 0,
	};
}
