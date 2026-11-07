import {
	and,
	asc,
	desc,
	eq,
	ilike,
	inArray,
	notInArray,
	sql,
} from "drizzle-orm";

import { getPermissionKeys } from "./access";
import type { PermissionKey } from "./access-catalogue";
import { recordAudit } from "./audit";
import {
	assertCanBeRetired,
	markSourceRetired,
} from "./change-kinds/source-retirement";
import {
	type ContentRevisionStatus,
	contentRevisionStatusLabels,
	openRevisionStatuses,
} from "./content-kinds";
import { moveSourceLinks, revisionsNamingSource } from "./content-links";
import { getContentState } from "./content-queues";
import { saveDraft } from "./content-workflow";
import type { DbExecutor } from "./db-executor";
import {
	claimBodySchema,
	excerptBodySchema,
	sourceBodySchema,
	titlesLookAlike,
} from "./evidence-body";
import { listRevisionCitations, refreshExcerptTitles } from "./evidence-kinds";
import { GovernanceError } from "./governance-error";
import { user } from "./schema/auth";
import { citations } from "./schema/citations";
import { claimUsages } from "./schema/claim_usages";
import { claims } from "./schema/claims";
import { contentItems } from "./schema/content_items";
import { contentRevisions } from "./schema/content_revisions";
import { researchNoteSources } from "./schema/research_note_sources";
import { researchNotes } from "./schema/research_notes";
import { sourceExcerpts } from "./schema/source_excerpts";
import { sources } from "./schema/sources";
import { listProposals, proposeChange } from "./two-person";

const LIST_LIMIT = 100;

/** Revisions that still count as "what this says", now or soon. Older ones are just history. */
const currentRevisionStatuses = [
	"draft",
	"submitted",
	"in_review",
	"approved",
	"published",
] as const;

async function requirePermission(
	client: DbExecutor,
	userId: string,
	permission: PermissionKey,
) {
	const keys = await getPermissionKeys(client, userId);
	if (!keys.includes(permission)) {
		throw new GovernanceError("You don't have permission to do this.");
	}
}

const latestRevision = (column: string) =>
	sql.raw(
		`(select r.${column} from content_revisions r where r.content_item_id = content_items.id order by r.number desc limit 1)`,
	);

/** Each record's name and where its newest revision stands. */
const recordSummaryColumns = {
	contentItemId: contentItems.id,
	id: sql<number>`${contentItems.scopeKey}::int`.mapWith(Number),
	latestBody: sql<unknown>`${latestRevision("body")}`,
	latestNumber: sql<number | null>`${latestRevision("number")}`,
	latestRevisionId: sql<number | null>`${latestRevision("id")}`,
	latestStatus: sql<ContentRevisionStatus | null>`${latestRevision("status")}`,
	liveNumber: sql<
		number | null
	>`(select r.number from content_revisions r where r.id = content_items.live_revision_id)`,
	title: contentItems.title,
};

function recordSummaries(client: DbExecutor) {
	return client.select(recordSummaryColumns).from(contentItems);
}

function searchPattern(search?: string) {
	const trimmed = search?.trim();
	return trimmed ? `%${trimmed.replace(/[%_\\]/g, "\\$&")}%` : null;
}

export async function listSources(
	client: DbExecutor,
	filter: { includeInactive?: boolean; search?: string } = {},
) {
	const pattern = searchPattern(filter.search);
	const rows = await recordSummaries(client)
		.where(
			and(
				eq(contentItems.kind, "source"),
				pattern ? ilike(contentItems.title, pattern) : undefined,
			),
		)
		.orderBy(asc(contentItems.title))
		.limit(LIST_LIMIT);
	if (rows.length === 0) return [];

	const ids = rows.map(({ id }) => id);
	const standing = await client
		.select({
			excerptCount: sql<number>`(select count(*)::int from source_excerpts e where e.source_id = sources.id)`,
			id: sources.id,
			mergedIntoSourceId: sources.mergedIntoSourceId,
			status: sources.status,
		})
		.from(sources)
		.where(inArray(sources.id, ids));

	return rows.flatMap((row) => {
		const record = standing.find(({ id }) => id === row.id);
		if (!record) return [];
		if (!filter.includeInactive && record.status !== "active") return [];
		const { latestBody, ...summary } = row;
		return [
			{ ...summary, ...record, body: sourceBodySchema.parse(latestBody) },
		];
	});
}

export async function listExcerpts(
	client: DbExecutor,
	filter: { search?: string; sourceId?: number; usableOnly?: boolean } = {},
) {
	const pattern = searchPattern(filter.search);
	const rows = await client
		.select({
			...recordSummaryColumns,
			sourceId: sql<number>`(select e.source_id from source_excerpts e where e.id = ${contentItems.scopeKey}::int)`,
		})
		.from(contentItems)
		.where(
			and(
				eq(contentItems.kind, "source_excerpt"),
				pattern ? ilike(contentItems.title, pattern) : undefined,
				filter.sourceId
					? sql`${contentItems.scopeKey}::int IN (select e.id from source_excerpts e where e.source_id = ${filter.sourceId})`
					: undefined,
				filter.usableOnly
					? sql`${contentItems.scopeKey}::int IN (select e.id from source_excerpts e join sources s on s.id = e.source_id where s.status = 'active')`
					: undefined,
			),
		)
		.orderBy(asc(contentItems.title))
		.limit(LIST_LIMIT);
	return rows.map(({ latestBody, ...row }) => ({
		...row,
		body: excerptBodySchema.parse(latestBody),
	}));
}

export async function listClaims(
	client: DbExecutor,
	filter: { search?: string } = {},
) {
	const pattern = searchPattern(filter.search);
	const rows = await recordSummaries(client)
		.where(
			and(
				eq(contentItems.kind, "claim"),
				pattern ? ilike(contentItems.title, pattern) : undefined,
			),
		)
		.orderBy(desc(contentItems.id))
		.limit(LIST_LIMIT);
	return rows.map(({ latestBody, ...row }) => ({
		...row,
		body: claimBodySchema.parse(latestBody),
	}));
}

/** Other sources that may be the same work. Only ever a warning: editions can differ on purpose. */
export async function findSimilarSources(
	client: DbExecutor,
	input: { exceptSourceId?: number; title: string },
) {
	const title = input.title.trim();
	if (title.length < 4) return [];
	const rows = await recordSummaries(client).where(
		eq(contentItems.kind, "source"),
	);
	const matches = rows.filter((row) => {
		if (row.id === input.exceptSourceId) return false;
		return titlesLookAlike(title, sourceBodySchema.parse(row.latestBody).title);
	});
	if (matches.length === 0) return [];
	const active = await client
		.select({ id: sources.id })
		.from(sources)
		.where(
			and(
				inArray(
					sources.id,
					matches.map(({ id }) => id),
				),
				eq(sources.status, "active"),
			),
		);
	const activeIds = new Set(active.map(({ id }) => id));
	return matches
		.filter(({ id }) => activeIds.has(id))
		.map(({ id, title: name }) => ({ id, title: name }));
}

export type EvidenceSave =
	| { kind: "source"; id?: number; body: unknown }
	| { kind: "source_excerpt"; id?: number; sourceId?: number; body: unknown }
	| { kind: "claim"; id?: number; body: unknown };

/**
 * Saves a record as a draft. A new record's row and its first draft are created
 * together, so nothing is left behind if the draft is refused.
 */
export async function saveEvidenceDraft(
	client: DbExecutor,
	input: EvidenceSave & { actorUserId: string },
) {
	return client.transaction(async (tx) => {
		await requirePermission(tx, input.actorUserId, "sources.manage");
		let id = input.id;
		if (!id) {
			const createdByUserId = input.actorUserId;
			if (input.kind === "source") {
				const [row] = await tx
					.insert(sources)
					.values({ createdByUserId })
					.returning({ id: sources.id });
				id = row?.id;
			} else if (input.kind === "source_excerpt") {
				if (!input.sourceId) {
					throw new GovernanceError(
						"Choose the source this excerpt comes from.",
					);
				}
				const [row] = await tx
					.insert(sourceExcerpts)
					.values({ createdByUserId, sourceId: input.sourceId })
					.returning({ id: sourceExcerpts.id });
				id = row?.id;
			} else {
				const [row] = await tx
					.insert(claims)
					.values({ createdByUserId })
					.returning({ id: claims.id });
				id = row?.id;
			}
		}
		if (!id) throw new Error("Could not save this record.");

		const saved = await saveDraft(tx, {
			actorUserId: input.actorUserId,
			body: input.body,
			kind: input.kind,
			scopeKey: String(id),
		});
		return { ...saved, id };
	});
}

type UsedInRow = {
	id: string;
	label: string;
	meta: string;
	target:
		| { type: "revision"; contentItemId: number; revisionId: number }
		| { type: "excerpt"; excerptId: number }
		| { type: "research" };
};

async function usedInByCitation(client: DbExecutor, excerptIds: number[]) {
	if (excerptIds.length === 0) return [];
	const rows = await client
		.selectDistinct({
			contentItemId: contentItems.id,
			kind: contentItems.kind,
			number: contentRevisions.number,
			revisionId: contentRevisions.id,
			status: contentRevisions.status,
			title: contentItems.title,
		})
		.from(citations)
		.innerJoin(
			contentRevisions,
			eq(contentRevisions.id, citations.contentRevisionId),
		)
		.innerJoin(
			contentItems,
			eq(contentItems.id, contentRevisions.contentItemId),
		)
		.where(
			and(
				inArray(citations.excerptId, excerptIds),
				inArray(contentRevisions.status, [...currentRevisionStatuses]),
			),
		)
		.orderBy(desc(contentRevisions.id));
	return rows.map(
		(row): UsedInRow => ({
			id: `revision-${row.revisionId}`,
			label: row.title,
			meta: `Revision #${row.number} · ${contentRevisionStatusLabels[row.status]}`,
			target: {
				contentItemId: row.contentItemId,
				revisionId: row.revisionId,
				type: "revision",
			},
		}),
	);
}

/** Every record that depends on this source, which is what retiring it would affect. */
export async function sourceUsedIn(client: DbExecutor, sourceId: number) {
	const excerpts = await listExcerpts(client, { sourceId });
	const notes = await client
		.select({ id: researchNotes.id, reference: researchNotes.reference })
		.from(researchNoteSources)
		.innerJoin(
			researchNotes,
			eq(researchNotes.id, researchNoteSources.researchNoteId),
		)
		.where(eq(researchNoteSources.sourceId, sourceId));
	return [
		...excerpts.map(
			(excerpt): UsedInRow => ({
				id: `excerpt-${excerpt.id}`,
				label: excerpt.body.location || "Untitled excerpt",
				meta: excerpt.liveNumber
					? `Excerpt · Live: Revision #${excerpt.liveNumber}`
					: "Excerpt · Not live yet",
				target: { excerptId: excerpt.id, type: "excerpt" },
			}),
		),
		...(await usedInByCitation(
			client,
			excerpts.map(({ id }) => id),
		)),
		...(
			await revisionsNamingSource(client, sourceId, currentRevisionStatuses)
		).map(
			(row): UsedInRow => ({
				id: `named-${row.revisionId}`,
				label: row.title,
				meta: `Revision #${row.number} · ${contentRevisionStatusLabels[row.status]} · Names this source`,
				target: {
					contentItemId: row.contentItemId,
					revisionId: row.revisionId,
					type: "revision",
				},
			}),
		),
		...notes.map(
			(note): UsedInRow => ({
				id: `note-${note.id}`,
				label: `Research note on ${note.reference}`,
				meta: "Staff only",
				target: { type: "research" },
			}),
		),
	];
}

async function claimUsedIn(client: DbExecutor, claimId: number) {
	const rows = await client
		.select({
			contentItemId: contentItems.id,
			number: contentRevisions.number,
			revisionId: contentRevisions.id,
			status: contentRevisions.status,
			title: contentItems.title,
		})
		.from(claimUsages)
		.innerJoin(
			contentRevisions,
			eq(contentRevisions.id, claimUsages.contentRevisionId),
		)
		.innerJoin(
			contentItems,
			eq(contentItems.id, contentRevisions.contentItemId),
		)
		.where(eq(claimUsages.claimId, claimId));
	return rows.map(
		(row): UsedInRow => ({
			id: `revision-${row.revisionId}`,
			label: row.title,
			meta: `Revision #${row.number} · ${contentRevisionStatusLabels[row.status]}`,
			target: {
				contentItemId: row.contentItemId,
				revisionId: row.revisionId,
				type: "revision",
			},
		}),
	);
}

async function pendingRetirement(
	client: DbExecutor,
	sourceId: number,
	viewerUserId: string,
) {
	const [proposal] = await listProposals(client, {
		kinds: ["source_retirement"],
		status: "proposed",
		target: { id: String(sourceId), type: "source" },
	});
	if (!proposal) return null;
	const [proposer] = await client
		.select({ name: user.name })
		.from(user)
		.where(eq(user.id, proposal.proposerUserId));
	return {
		id: proposal.id,
		proposedByMe: proposal.proposerUserId === viewerUserId,
		proposerName: proposer?.name ?? "Someone",
		reason: proposal.reason,
	};
}

async function getSourceRecord(
	client: DbExecutor,
	sourceId: number,
	viewerUserId: string,
) {
	const [source] = await client
		.select({
			mergedIntoSourceId: sources.mergedIntoSourceId,
			status: sources.status,
		})
		.from(sources)
		.where(eq(sources.id, sourceId));
	if (!source) return null;
	return {
		...source,
		id: sourceId,
		pendingRetirement: await pendingRetirement(client, sourceId, viewerUserId),
		state: await getContentState(
			client,
			{ kind: "source", scopeKey: String(sourceId) },
			viewerUserId,
		),
		usedIn: await sourceUsedIn(client, sourceId),
	};
}

async function getExcerptRecord(
	client: DbExecutor,
	excerptId: number,
	viewerUserId: string,
) {
	const [excerpt] = await client
		.select({ sourceId: sourceExcerpts.sourceId })
		.from(sourceExcerpts)
		.where(eq(sourceExcerpts.id, excerptId));
	if (!excerpt) return null;
	return {
		id: excerptId,
		sourceId: excerpt.sourceId,
		state: await getContentState(
			client,
			{ kind: "source_excerpt", scopeKey: String(excerptId) },
			viewerUserId,
		),
		usedIn: await usedInByCitation(client, [excerptId]),
	};
}

async function getClaimRecord(
	client: DbExecutor,
	claimId: number,
	viewerUserId: string,
) {
	const [claim] = await client
		.select({ id: claims.id })
		.from(claims)
		.where(eq(claims.id, claimId));
	if (!claim) return null;
	const state = await getContentState(
		client,
		{ kind: "claim", scopeKey: String(claimId) },
		viewerUserId,
	);

	const excerptIds = state.body.citations.map(({ excerptId }) => excerptId);
	const excerpts =
		excerptIds.length > 0
			? await client
					.select({
						excerptId: sourceExcerpts.id,
						live: contentItems.liveRevisionId,
						sourceId: sourceExcerpts.sourceId,
						title: contentItems.title,
					})
					.from(sourceExcerpts)
					.innerJoin(
						contentItems,
						and(
							eq(contentItems.kind, "source_excerpt"),
							eq(contentItems.scopeKey, sql`${sourceExcerpts.id}::text`),
						),
					)
					.where(inArray(sourceExcerpts.id, excerptIds))
			: [];

	const liveCitations = state.live
		? await listRevisionCitations(client, state.live.revisionId)
		: [];

	return {
		citations: state.body.citations.map((citation, index) => {
			const excerpt = excerpts.find(
				({ excerptId }) => excerptId === citation.excerptId,
			);
			return {
				...citation,
				excerptIsLive: Boolean(excerpt?.live),
				excerptTitle: excerpt?.title ?? "Excerpt no longer available",
				index,
				sourceId: excerpt?.sourceId ?? null,
			};
		}),
		id: claimId,
		liveCitations,
		state,
		usedIn: await claimUsedIn(client, claimId),
	};
}

/**
 * Everything the workbench shows for the records picked in its chain. Picking an
 * excerpt also picks its source, so the chain can never show two that don't belong.
 */
export async function getEvidenceWorkbench(
	client: DbExecutor,
	input: { claimId?: number; excerptId?: number; sourceId?: number },
	viewerUserId: string,
) {
	const excerpt = input.excerptId
		? await getExcerptRecord(client, input.excerptId, viewerUserId)
		: null;
	const sourceId = excerpt?.sourceId ?? input.sourceId;
	const source = sourceId
		? await getSourceRecord(client, sourceId, viewerUserId)
		: null;
	const claim = input.claimId
		? await getClaimRecord(client, input.claimId, viewerUserId)
		: null;

	return {
		claim,
		claimOptions: await listClaims(client),
		excerpt,
		excerptOptions: await listExcerpts(client),
		source,
		sourceOptions: await listSources(client),
	};
}

/**
 * Folds a duplicate source into the one being kept. Everything that hung off the
 * duplicate moves across. The duplicate stays on record and points to the survivor,
 * so anything published against it can still be traced.
 */
export async function mergeSources(
	client: DbExecutor,
	input: {
		actorUserId: string;
		keepSourceId: number;
		mergeSourceId: number;
		reason: string;
	},
) {
	const reason = input.reason.trim();
	if (!reason) throw new GovernanceError("Say why these are the same source.");
	if (input.keepSourceId === input.mergeSourceId) {
		throw new GovernanceError("Choose two different sources to merge.");
	}

	await client.transaction(async (tx) => {
		await requirePermission(tx, input.actorUserId, "sources.merge");

		// Taking these in id order means two merges at once can't wait on each other.
		const rows = await tx
			.select({ id: sources.id, status: sources.status })
			.from(sources)
			.where(inArray(sources.id, [input.keepSourceId, input.mergeSourceId]))
			.orderBy(asc(sources.id))
			.for("update");
		if (rows.length !== 2) {
			throw new GovernanceError("One of these sources no longer exists.");
		}
		if (rows.some(({ status }) => status !== "active")) {
			throw new GovernanceError(
				"A retired or already merged source can't be merged.",
			);
		}

		const items = await tx
			.select({
				id: contentItems.id,
				liveRevisionId: contentItems.liveRevisionId,
				scopeKey: contentItems.scopeKey,
				title: contentItems.title,
			})
			.from(contentItems)
			.where(
				and(
					eq(contentItems.kind, "source"),
					inArray(contentItems.scopeKey, [
						String(input.keepSourceId),
						String(input.mergeSourceId),
					]),
				),
			);
		const keep = items.find(
			({ scopeKey }) => scopeKey === String(input.keepSourceId),
		);
		const duplicate = items.find(
			({ scopeKey }) => scopeKey === String(input.mergeSourceId),
		);
		if (!keep || !duplicate) {
			throw new GovernanceError("One of these sources no longer exists.");
		}

		// Published excerpts can't end up resting on a source that isn't published.
		if (duplicate.liveRevisionId && !keep.liveRevisionId) {
			throw new GovernanceError(
				"Keep the source that's already live, or publish this one before merging.",
			);
		}

		const [unfinished] = await tx
			.select({ id: contentRevisions.id })
			.from(contentRevisions)
			.where(
				and(
					eq(contentRevisions.contentItemId, duplicate.id),
					inArray(contentRevisions.status, [...openRevisionStatuses]),
				),
			)
			.limit(1);
		if (unfinished) {
			throw new GovernanceError(
				`"${duplicate.title}" has a revision still in progress. Finish it or throw it away before merging.`,
			);
		}

		await tx
			.update(sourceExcerpts)
			.set({ sourceId: input.keepSourceId })
			.where(eq(sourceExcerpts.sourceId, input.mergeSourceId));

		// A note can cite both records. It keeps its link to the survivor in that case.
		const alreadyOnKeep = await tx
			.select({ noteId: researchNoteSources.researchNoteId })
			.from(researchNoteSources)
			.where(eq(researchNoteSources.sourceId, input.keepSourceId));
		const noteIds = alreadyOnKeep.map(({ noteId }) => noteId);
		await tx
			.update(researchNoteSources)
			.set({ sourceId: input.keepSourceId })
			.where(
				and(
					eq(researchNoteSources.sourceId, input.mergeSourceId),
					noteIds.length > 0
						? notInArray(researchNoteSources.researchNoteId, noteIds)
						: undefined,
				),
			);
		await tx
			.delete(researchNoteSources)
			.where(eq(researchNoteSources.sourceId, input.mergeSourceId));

		await moveSourceLinks(tx, {
			fromSourceId: input.mergeSourceId,
			toSourceId: input.keepSourceId,
		});
		await tx
			.update(sources)
			.set({ mergedIntoSourceId: input.keepSourceId, status: "merged" })
			.where(eq(sources.id, input.mergeSourceId));
		await refreshExcerptTitles(tx, input.keepSourceId);

		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "source.merged",
			targetType: "source",
			targetId: input.mergeSourceId,
			details: {
				name: `${duplicate.title} into ${keep.title}`,
				reason,
			},
		});
	});
}

/**
 * Retires a source. If nothing depends on it, that's done straight away. If anything
 * does, a second person has to confirm it after seeing what it affects.
 */
export async function retireSource(
	client: DbExecutor,
	input: { actorUserId: string; reason: string; sourceId: number },
) {
	const reason = input.reason.trim();
	if (!reason)
		throw new GovernanceError("Say why this source is being retired.");

	return client.transaction(async (tx) => {
		await requirePermission(tx, input.actorUserId, "sources.retire");
		await assertCanBeRetired(tx, input.sourceId);

		const inUse = (await sourceUsedIn(tx, input.sourceId)).length > 0;
		if (inUse) {
			await proposeChange(tx, {
				kind: "source_retirement",
				payload: { sourceId: input.sourceId },
				proposerUserId: input.actorUserId,
				reason,
			});
			return { outcome: "proposed" as const };
		}

		await markSourceRetired(tx, input.sourceId);
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "source.retired",
			targetType: "source",
			targetId: input.sourceId,
			details: { reason },
		});
		return { outcome: "retired" as const };
	});
}
