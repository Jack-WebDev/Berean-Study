import { and, count, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import type { PermissionKey } from "./access-catalogue";
import {
	type AuditAction,
	auditActionLabels,
	isAuditAction,
} from "./audit-catalogue";
import { listRecentAuditEntries, readAuditDetails } from "./audit-log";
import { listOpenReports } from "./community-moderation";
import type { ContentRevisionStatus } from "./content-kinds";
import { listOpenIssues } from "./content-queues";
import type { DbExecutor } from "./db-executor";
import { auditLog } from "./schema/audit_log";
import { user } from "./schema/auth";
import { contentItems } from "./schema/content_items";
import { contentRevisions } from "./schema/content_revisions";
import { publicationHistory } from "./schema/publication_history";
import { researchNotes } from "./schema/research_notes";
import {
	foundationChangeKinds,
	getStaffQueueCounts,
	peopleChangeKinds,
} from "./staff-queues";
import { listProposals, type ProposalSummary } from "./two-person";
import { countChaptersReadyToPublish } from "./verse-proofreading";

const DAY_MS = 86_400_000;
const LIST_LIMIT = 5;
const ACTIVITY_LIMIT = 8;

/** Evidence is checked before it is written about, so its drafts are "Verification". */
const evidenceKinds = ["source", "source_excerpt", "claim"];

/** Issue types that could mislead a reader, so they're looked at first. */
const highPriorityIssueTypes = ["factual_error", "citation_problem"];

const scriptureChangeActions = [
	"structure_change.confirmed",
	"canon_change.confirmed",
	"translation.details_changed",
	"translation.permission_recorded",
	"translation.permission_removed",
	"book.record_changed",
] as const satisfies readonly AuditAction[];

const authorizationChangeActions = [
	"role.created",
	"role.granted",
	"role.revoked",
	"role_permission.added",
	"role_permission.removed",
] as const satisfies readonly AuditAction[];

/** Applied straight away by one Superadmin, so they never appear as proposals. */
const translationRecordActions = [
	"translation.details_changed",
	"translation.permission_recorded",
	"translation.permission_removed",
] as const satisfies readonly AuditAction[];

export type OverviewTile = {
	domain: string;
	href: string;
	key: string;
	label: string;
	note: string;
	value: number;
};

export type OverviewSeverity =
	| "high"
	| "community"
	| "ready"
	| "authorization"
	| "scripture";

const severityOrder: readonly OverviewSeverity[] = [
	"high",
	"community",
	"ready",
	"authorization",
	"scripture",
];

export type OverviewAttentionItem = {
	action: string;
	detail: string;
	href: string;
	key: string;
	severity: OverviewSeverity;
	title: string;
};

export type OverviewFoundationItem = {
	detail: string;
	href: string | null;
	key: string;
	status: "confirm" | "decide" | "waiting" | "applied";
	title: string;
};

function daysAgo(days: number) {
	return new Date(Date.now() - days * DAY_MS);
}

function plural(value: number, one: string, many = `${one}s`) {
	return `${value} ${value === 1 ? one : many}`;
}

function hoursSince(date: Date) {
	return Math.floor((Date.now() - date.getTime()) / (DAY_MS / 24));
}

async function countByRevisionStatus(client: DbExecutor) {
	const rows = await client
		.select({
			isEvidence: sql<boolean>`${contentItems.kind} IN (${sql.join(
				evidenceKinds.map((kind) => sql`${kind}`),
				sql`, `,
			)})`,
			status: contentRevisions.status,
			value: count(),
		})
		.from(contentRevisions)
		.innerJoin(
			contentItems,
			eq(contentItems.id, contentRevisions.contentItemId),
		)
		.where(
			inArray(contentRevisions.status, [
				"draft",
				"changes_requested",
				"submitted",
				"in_review",
				"approved",
			] satisfies ContentRevisionStatus[]),
		)
		.groupBy(sql`1`, contentRevisions.status);

	const sum = (
		statuses: readonly ContentRevisionStatus[],
		isEvidence?: boolean,
	) =>
		rows
			.filter(
				(row) =>
					statuses.includes(row.status as ContentRevisionStatus) &&
					(isEvidence === undefined || row.isEvidence === isEvidence),
			)
			.reduce((total, row) => total + row.value, 0);

	return {
		approved: sum(["approved"]),
		changesRequested: sum(["changes_requested"]),
		evidenceDrafts: sum(["draft", "changes_requested"], true),
		review: sum(["submitted", "in_review"]),
		writingDrafts: sum(["draft", "changes_requested"], false),
	};
}

/** Each published piece and each published chapter counts once. */
async function countPublications(client: DbExecutor, since: Date) {
	const [pieces] = await client
		.select({ value: count() })
		.from(publicationHistory)
		.where(
			and(
				eq(publicationHistory.action, "published"),
				gt(publicationHistory.createdAt, since),
			),
		);
	const [chapters] = await client
		.select({ value: count() })
		.from(auditLog)
		.where(
			and(
				eq(auditLog.action, "verse_text.published" satisfies AuditAction),
				gt(auditLog.occurredAt, since),
			),
		);
	return (pieces?.value ?? 0) + (chapters?.value ?? 0);
}

async function countAuditActions(
	client: DbExecutor,
	actions: readonly AuditAction[],
	since: Date,
) {
	const [result] = await client
		.select({ value: count() })
		.from(auditLog)
		.where(
			and(
				inArray(auditLog.action, [...actions]),
				gt(auditLog.occurredAt, since),
			),
		);
	return result?.value ?? 0;
}

/** Anyone who wrote, researched, checked or published in the window. */
async function countActiveContributors(client: DbExecutor, since: Date) {
	const [writers, researchers, actors] = await Promise.all([
		client
			.selectDistinct({ userId: contentRevisions.createdByUserId })
			.from(contentRevisions)
			.where(gt(contentRevisions.updatedAt, since)),
		client
			.selectDistinct({ userId: researchNotes.createdByUserId })
			.from(researchNotes)
			.where(gt(researchNotes.updatedAt, since)),
		client
			.selectDistinct({ userId: auditLog.actorUserId })
			.from(auditLog)
			.where(
				and(
					inArray(auditLog.domain, ["editorial", "publication", "scripture"]),
					gt(auditLog.occurredAt, since),
				),
			),
	]);
	return new Set(
		[...writers, ...researchers, ...actors].map(({ userId }) => userId),
	).size;
}

function chipFor(
	proposal: ProposalSummary,
	viewerUserId: string,
): OverviewFoundationItem["status"] {
	if (proposal.status === "applied") return "applied";
	if (proposal.proposerUserId === viewerUserId) return "waiting";
	return proposal.kind === "role_change" ? "decide" : "confirm";
}

function attentionFor(
	proposal: ProposalSummary,
	severity: OverviewSeverity,
): OverviewAttentionItem {
	return {
		action: proposal.kind === "role_change" ? "Decide" : "Confirm",
		detail: proposal.description,
		href: proposal.destination,
		key: `proposal-${proposal.id}`,
		severity,
		title: proposal.title,
	};
}

/**
 * What's happening across Berean Study, cut down to what this person's
 * permissions let them see or act on. Nothing here reads anyone's private library,
 * and there are deliberately no engagement figures or system measurements.
 */
export async function getAdminOverview(
	client: DbExecutor,
	viewer: { permissionKeys: readonly PermissionKey[]; userId: string },
) {
	const { permissionKeys, userId } = viewer;
	const holds = (...keys: PermissionKey[]) =>
		keys.some((key) => permissionKeys.includes(key));

	const canSeeEditorial = holds("editorial.assign", "editorial.review");
	const canSeePublication = holds(
		"publication.publish",
		"publication.withdraw",
	);
	const canSeePipeline = canSeeEditorial || canSeePublication;
	const canSeeIssues = holds("issues.manage");
	const canModerate = holds("community.moderate");
	const canSeePeople = holds("contributors.manage", "admins.manage");
	const canSeeScriptureChanges = holds("canon.manage", "scripture.manage");
	const canSeeAuthorization = holds("admins.manage", "roles.manage");
	const canSeeActivity = holds("audit.view", "audit.view_all");

	const tiles: OverviewTile[] = [];
	const attention: OverviewAttentionItem[] = [];

	const queueCounts = await getStaffQueueCounts(client, viewer);
	const statuses = canSeePipeline ? await countByRevisionStatus(client) : null;
	const readyChapters = canSeePublication
		? await countChaptersReadyToPublish(client)
		: 0;
	const publishedRecently = canSeePipeline
		? await countPublications(client, daysAgo(30))
		: 0;

	if (canSeeEditorial && statuses) {
		tiles.push({
			domain: "Editorial",
			href: holds("editorial.assign") ? "/admin/editorial" : "/work/reviews",
			key: "awaiting-review",
			label: "Awaiting review",
			note: `${statuses.changesRequested} with changes requested`,
			value: statuses.review,
		});
	}

	if (canSeePublication && statuses) {
		const ready = queueCounts.readyToPublish ?? 0;
		tiles.push({
			domain: "Publication",
			href: "/admin/publication",
			key: "ready-to-publish",
			label: "Ready to publish",
			note: `${plural(statuses.approved, "approved piece")}, ${plural(readyChapters, "chapter")}`,
			value: ready,
		});
		if (ready > 0) {
			attention.push({
				action: "Review",
				detail: `${plural(statuses.approved, "approved piece")} and ${plural(readyChapters, "proofread chapter")} are waiting.`,
				href: "/admin/publication",
				key: "ready",
				severity: "ready",
				title: `${plural(ready, "item")} ready to publish`,
			});
		}
	}

	if (canSeeIssues) {
		const issues = await listOpenIssues(client);
		const urgent = issues.filter(({ issueType }) =>
			highPriorityIssueTypes.includes(issueType),
		);
		tiles.push({
			domain: "Content",
			href: "/admin/content-issues",
			key: "open-issues",
			label: "Open content issues",
			note: `${urgent.length} high priority`,
			value: issues.length,
		});
		if (urgent.length > 0) {
			attention.push({
				action: "Open issues",
				detail: urgent
					.slice(0, 2)
					.map(({ description, title }) => `${title}: ${description}`)
					.join(" "),
				href: "/admin/content-issues",
				key: "high-priority-issues",
				severity: "high",
				title: `${plural(urgent.length, "factual or citation issue")} to look at first`,
			});
		}
	}

	if (canModerate) {
		const reports = await listOpenReports(client);
		const overADay = reports.filter(
			({ oldestAt }) => hoursSince(oldestAt) >= 24,
		).length;
		tiles.push({
			domain: "Community",
			href: "/admin/moderation",
			key: "open-reports",
			label: "Open reports",
			note: `${overADay} older than 24 hours`,
			value: reports.length,
		});
		const oldest = reports[0];
		if (oldest) {
			const withPriorRemoval = reports.filter(
				({ authorHasPriorRemoval }) => authorHasPriorRemoval,
			).length;
			attention.push({
				action: "Open queue",
				detail: [
					hoursSince(oldest.oldestAt) < 1
						? "The oldest came in within the last hour."
						: `The oldest has waited ${plural(hoursSince(oldest.oldestAt), "hour")}.`,
					withPriorRemoval > 0
						? `${plural(withPriorRemoval, "involves an author", "involve authors")} with a prior removal.`
						: null,
				]
					.filter(Boolean)
					.join(" "),
				href: "/admin/moderation",
				key: "reports",
				severity: "community",
				title: `${plural(reports.length, "report")} to review`,
			});
		}
	}

	if (canSeePeople) {
		tiles.push({
			domain: "Contributors",
			href: holds("contributors.manage")
				? "/admin/contributors"
				: "/admin/users",
			key: "active-contributors",
			label: "Active contributors",
			note: "Active in the last 30 days",
			value: await countActiveContributors(client, daysAgo(30)),
		});
	}

	if (canSeePipeline) {
		tiles.push({
			domain: "Publication",
			href: "/admin/publication",
			key: "recent-publications",
			label: "Recent publications",
			note: "Last 30 days",
			value: publishedRecently,
		});
	}

	if (canSeePeople) {
		const [newMembers] = await client
			.select({ value: count() })
			.from(user)
			.where(and(gt(user.createdAt, daysAgo(7)), isNull(user.deletedAt)));
		tiles.push({
			domain: "Members",
			href: holds("admins.manage") ? "/admin/users" : "/admin/contributors",
			key: "new-members",
			label: "New members",
			note: "Last 7 days",
			value: newMembers?.value ?? 0,
		});
	}

	const pendingScripture = canSeeScriptureChanges
		? await listProposals(client, {
				kinds: foundationChangeKinds,
				status: "proposed",
			})
		: [];
	if (canSeeScriptureChanges) {
		const made = await countAuditActions(
			client,
			scriptureChangeActions,
			daysAgo(30),
		);
		tiles.push({
			domain: "Scripture data",
			href: "/admin/canon",
			key: "scripture-changes",
			label: "Scripture-data changes",
			note: `${pendingScripture.length} awaiting confirmation`,
			value: made + pendingScripture.length,
		});
		for (const proposal of pendingScripture
			.filter(({ proposerUserId }) => proposerUserId !== userId)
			.slice(0, LIST_LIMIT)) {
			attention.push(attentionFor(proposal, "scripture"));
		}
	}

	const pendingPeople = canSeeAuthorization
		? await listProposals(client, {
				kinds: peopleChangeKinds,
				status: "proposed",
			})
		: [];
	if (canSeeAuthorization) {
		const made = await countAuditActions(
			client,
			authorizationChangeActions,
			daysAgo(30),
		);
		tiles.push({
			domain: "Authorization",
			href: holds("admins.manage") ? "/admin/users" : "/admin/roles",
			key: "authorization-changes",
			label: "Authorization changes",
			note: `${pendingPeople.length} awaiting a decision`,
			value: made + pendingPeople.length,
		});
		for (const proposal of pendingPeople
			.filter(
				({ decidePermission, proposerUserId }) =>
					proposerUserId !== userId && holds(decidePermission),
			)
			.slice(0, LIST_LIMIT)) {
			attention.push(attentionFor(proposal, "authorization"));
		}
	}

	const pipeline =
		canSeePipeline && statuses
			? [
					{
						count: await countRecentResearchNotes(client),
						label: "Research",
						note: "notes in 30 days",
						tone: "plain",
					},
					{
						count: statuses.evidenceDrafts,
						label: "Verification",
						note: "evidence drafts",
						tone: "plain",
					},
					{
						count: statuses.writingDrafts,
						label: "Writing",
						note: "drafts",
						tone: "plain",
					},
					{
						count: statuses.review,
						label: "Review",
						note: `${statuses.changesRequested} changes requested`,
						tone: "attention",
					},
					{
						count: canSeePublication
							? (queueCounts.readyToPublish ?? 0)
							: statuses.approved,
						label: "Ready",
						note: "to publish",
						tone: "success",
					},
					{
						count: publishedRecently,
						label: "Published",
						note: "last 30 days",
						tone: "neutral",
					},
				]
			: null;

	return {
		activity: canSeeActivity
			? await recentActivity(client, viewer, holds("audit.view_all"))
			: null,
		attention: attention.sort(
			(a, b) =>
				severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
		),
		canOpenAudit: canSeeActivity,
		canOpenEditorial: holds("editorial.assign"),
		// Who holds any of these takes part in second-Superadmin decisions.
		foundations: holds(
			"admins.manage",
			"canon.manage",
			"roles.manage",
			"scripture.manage",
			"translations.manage",
		)
			? await foundationItems(client, viewer, {
					canSeeTranslations: holds("translations.manage"),
				})
			: null,
		pipeline,
		tiles,
	};
}

async function countRecentResearchNotes(client: DbExecutor) {
	const [result] = await client
		.select({ value: count() })
		.from(researchNotes)
		.where(gt(researchNotes.updatedAt, daysAgo(30)));
	return result?.value ?? 0;
}

async function recentActivity(
	client: DbExecutor,
	viewer: { userId: string },
	canViewAll: boolean,
) {
	const entries = await listRecentAuditEntries(
		client,
		{ canViewAll, userId: viewer.userId },
		ACTIVITY_LIMIT,
	);
	return entries.map((entry) => ({
		actorName: entry.actorName,
		domain: entry.domain,
		id: entry.id,
		occurredAt: entry.occurredAt,
		target: entry.targetName ?? entry.details.name ?? null,
		text: isAuditAction(entry.action)
			? auditActionLabels[entry.action]
			: entry.action,
	}));
}

/**
 * Changes that needed a second Superadmin: those still waiting, then the latest
 * applied. Only changes this person could themselves decide are listed.
 */
async function foundationItems(
	client: DbExecutor,
	viewer: { permissionKeys: readonly PermissionKey[]; userId: string },
	options: { canSeeTranslations: boolean },
): Promise<OverviewFoundationItem[]> {
	const canDecide = ({ decidePermission }: ProposalSummary) =>
		viewer.permissionKeys.includes(decidePermission);
	const toItem = (proposal: ProposalSummary): OverviewFoundationItem => ({
		detail: proposal.description,
		href: proposal.destination,
		key: `proposal-${proposal.id}`,
		status: chipFor(proposal, viewer.userId),
		title: proposal.title,
	});

	const pending = (await listProposals(client, { status: "proposed" }))
		.filter(canDecide)
		.map(toItem);
	const applied = (
		await listProposals(client, { limit: LIST_LIMIT, status: "applied" })
	)
		.filter(canDecide)
		.map((proposal) => ({ at: proposal.decidedAt, item: toItem(proposal) }));

	const translationRecords = options.canSeeTranslations
		? await client
				.select({
					action: auditLog.action,
					details: auditLog.details,
					id: auditLog.id,
					occurredAt: auditLog.occurredAt,
				})
				.from(auditLog)
				.where(inArray(auditLog.action, [...translationRecordActions]))
				.orderBy(desc(auditLog.occurredAt))
				.limit(LIST_LIMIT)
		: [];

	const recent = [
		...applied,
		...translationRecords.map((record) => ({
			at: record.occurredAt,
			item: {
				detail: isAuditAction(record.action)
					? auditActionLabels[record.action]
					: record.action,
				href: "/admin/translations",
				key: `audit-${record.id}`,
				status: "applied" as const,
				title: `${readAuditDetails(record.details).name ?? "Translation"} details`,
			},
		})),
	]
		.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
		.slice(0, LIST_LIMIT)
		.map(({ item }) => item);

	return [...pending, ...recent];
}
