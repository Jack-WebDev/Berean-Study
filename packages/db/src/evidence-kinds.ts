import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
	assertCitedEvidenceLive,
	assertCitedExcerptsExist,
	assertCitedSourcesUsable,
	assertSourceUsable,
	getRecordItem,
	pinRevisionCitations,
	syncRevisionCitations,
} from "./cited-evidence";
import type { ContentKindDefinition } from "./content-kind-registry";
import type { DbExecutor } from "./db-executor";
import {
	type ClaimBody,
	claimBodySchema,
	claimFields,
	claimProblems,
	type ExcerptBody,
	emptyClaimBody,
	emptyExcerptBody,
	emptySourceBody,
	excerptBodySchema,
	excerptFields,
	excerptProblems,
	type SourceBody,
	sourceBodySchema,
	sourceFields,
	sourceLabel,
	sourceProblems,
} from "./evidence-body";
import { GovernanceError } from "./governance-error";
import { citations } from "./schema/citations";
import { claimUsages } from "./schema/claim_usages";
import { claims } from "./schema/claims";
import { contentItems } from "./schema/content_items";
import { contentRevisions } from "./schema/content_revisions";
import { sourceExcerpts } from "./schema/source_excerpts";
import { sources } from "./schema/sources";
import { resolveScriptureReference } from "./scripture-reference";

const writePermissions = {
	create: "sources.manage",
	revise: "sources.manage",
} as const;

/** Each evidence record's content item is found by the id of its own row. */
function recordId(scopeKey: string) {
	const id = Number(scopeKey);
	if (!Number.isInteger(id) || id < 1) {
		throw new GovernanceError("This record no longer exists.");
	}
	return id;
}

async function getSourceRow(client: DbExecutor, sourceId: number) {
	const [source] = await client
		.select({ id: sources.id, status: sources.status })
		.from(sources)
		.where(eq(sources.id, sourceId));
	if (!source) throw new GovernanceError("This source no longer exists.");
	return source;
}

async function getExcerptRow(client: DbExecutor, excerptId: number) {
	const [excerpt] = await client
		.select({ id: sourceExcerpts.id, sourceId: sourceExcerpts.sourceId })
		.from(sourceExcerpts)
		.where(eq(sourceExcerpts.id, excerptId));
	if (!excerpt) throw new GovernanceError("This excerpt no longer exists.");
	return excerpt;
}

async function latestSourceBody(client: DbExecutor, sourceId: number) {
	const item = await getRecordItem(client, "source", sourceId);
	if (!item) return emptySourceBody;
	const [latest] = await client
		.select({ body: contentRevisions.body })
		.from(contentRevisions)
		.where(eq(contentRevisions.contentItemId, item.id))
		.orderBy(desc(contentRevisions.number))
		.limit(1);
	return latest ? sourceBodySchema.parse(latest.body) : emptySourceBody;
}

function excerptTitle(sourceBody: SourceBody, body: ExcerptBody) {
	return `${sourceLabel(sourceBody)}: ${body.location || "untitled excerpt"}`;
}

/** An excerpt is listed under its source's name, so it follows when that name changes. */
export async function refreshExcerptTitles(
	client: DbExecutor,
	sourceId: number,
) {
	const rows = await client
		.select({ id: sourceExcerpts.id })
		.from(sourceExcerpts)
		.where(eq(sourceExcerpts.sourceId, sourceId));
	if (rows.length === 0) return;

	const sourceBody = await latestSourceBody(client, sourceId);
	for (const { id } of rows) {
		const item = await getRecordItem(client, "source_excerpt", id);
		if (!item) continue;
		const [latest] = await client
			.select({ body: contentRevisions.body })
			.from(contentRevisions)
			.where(eq(contentRevisions.contentItemId, item.id))
			.orderBy(desc(contentRevisions.number))
			.limit(1);
		if (!latest) continue;
		await client
			.update(contentItems)
			.set({
				title: excerptTitle(sourceBody, excerptBodySchema.parse(latest.body)),
			})
			.where(eq(contentItems.id, item.id));
	}
}

function assertNoProblems(problems: string[]) {
	const [first] = problems;
	if (first) throw new GovernanceError(first);
}

export const sourceKind: ContentKindDefinition<SourceBody> = {
	label: "Source",
	body: sourceBodySchema,
	empty: emptySourceBody,
	requiresOriginalLanguageCheck: false,
	fields: sourceFields,
	writePermissions,
	titleFollowsBody: true,
	async title(client, scopeKey, body) {
		await getSourceRow(client, recordId(scopeKey));
		return sourceLabel(body ?? emptySourceBody);
	},
	assertCanDraft: (client, scopeKey) =>
		assertSourceUsable(client, recordId(scopeKey)),
	async assertReadyForReview(body, { client, scopeKey }) {
		assertNoProblems(sourceProblems(body));
		await assertSourceUsable(client, recordId(scopeKey));
	},
	assertReadyToPublish: (client, { scopeKey }) =>
		assertSourceUsable(client, recordId(scopeKey)),
	afterPublished: (client, { scopeKey }) =>
		refreshExcerptTitles(client, recordId(scopeKey)),
	async assertCanWithdraw(client, scopeKey) {
		const [live] = await client
			.select({ id: contentItems.id })
			.from(sourceExcerpts)
			.innerJoin(
				contentItems,
				and(
					eq(contentItems.kind, "source_excerpt"),
					eq(contentItems.scopeKey, sql`${sourceExcerpts.id}::text`),
				),
			)
			.where(
				and(
					eq(sourceExcerpts.sourceId, recordId(scopeKey)),
					isNotNull(contentItems.liveRevisionId),
				),
			)
			.limit(1);
		if (live) {
			throw new GovernanceError(
				"Published excerpts rest on this source, so it can't be withdrawn. A Superadmin can retire it instead.",
			);
		}
	},
	async removeWhenEmpty(client, scopeKey) {
		const id = recordId(scopeKey);
		const [excerpt] = await client
			.select({ id: sourceExcerpts.id })
			.from(sourceExcerpts)
			.where(eq(sourceExcerpts.sourceId, id))
			.limit(1);
		if (excerpt) {
			throw new GovernanceError(
				"This source already has excerpts, so its only draft can't be thrown away.",
			);
		}
		await client.delete(sources).where(eq(sources.id, id));
	},
};

export const excerptKind: ContentKindDefinition<ExcerptBody> = {
	label: "Source excerpt",
	body: excerptBodySchema,
	empty: emptyExcerptBody,
	requiresOriginalLanguageCheck: false,
	fields: excerptFields,
	writePermissions,
	titleFollowsBody: true,
	async title(client, scopeKey, body) {
		const excerpt = await getExcerptRow(client, recordId(scopeKey));
		return excerptTitle(
			await latestSourceBody(client, excerpt.sourceId),
			body ?? emptyExcerptBody,
		);
	},
	async assertCanDraft(client, scopeKey) {
		const excerpt = await getExcerptRow(client, recordId(scopeKey));
		await assertSourceUsable(client, excerpt.sourceId);
	},
	async assertReadyForReview(body, { client, scopeKey }) {
		assertNoProblems(excerptProblems(body));
		for (const passage of body.passages) {
			await resolveScriptureReference(client, passage);
		}
		const excerpt = await getExcerptRow(client, recordId(scopeKey));
		await assertSourceUsable(client, excerpt.sourceId);
	},
	async assertReadyToPublish(client, { scopeKey }) {
		const excerpt = await getExcerptRow(client, recordId(scopeKey));
		await assertSourceUsable(client, excerpt.sourceId);
		const source = await getRecordItem(client, "source", excerpt.sourceId);
		if (!source?.liveRevisionId) {
			throw new GovernanceError(
				"Publish the source first. An excerpt can't go live before the source it comes from.",
			);
		}
	},
	async assertCanWithdraw(client, scopeKey) {
		const [cited] = await client
			.select({ id: citations.id })
			.from(citations)
			.innerJoin(
				contentRevisions,
				eq(contentRevisions.id, citations.contentRevisionId),
			)
			.where(
				and(
					eq(citations.excerptId, recordId(scopeKey)),
					eq(contentRevisions.status, "published"),
				),
			)
			.limit(1);
		if (cited) {
			throw new GovernanceError(
				"Published content cites this excerpt, so it can't be withdrawn. Publish a corrected revision instead.",
			);
		}
	},
	async removeWhenEmpty(client, scopeKey) {
		const id = recordId(scopeKey);
		const [cited] = await client
			.select({ id: citations.id })
			.from(citations)
			.where(eq(citations.excerptId, id))
			.limit(1);
		if (cited) {
			throw new GovernanceError(
				"A claim cites this excerpt, so its only draft can't be thrown away.",
			);
		}
		await client.delete(sourceExcerpts).where(eq(sourceExcerpts.id, id));
	},
};

function claimTitle(body: ClaimBody) {
	const { statement } = body;
	if (!statement) return "Untitled claim";
	return statement.length > 80
		? `${statement.slice(0, 80).trimEnd()}…`
		: statement;
}

export const claimKind: ContentKindDefinition<ClaimBody> = {
	label: "Claim",
	body: claimBodySchema,
	empty: emptyClaimBody,
	requiresOriginalLanguageCheck: false,
	fields: claimFields,
	writePermissions,
	titleFollowsBody: true,
	async title(_client, _scopeKey, body) {
		return claimTitle(body ?? emptyClaimBody);
	},
	assertCanDraft: (client, _scopeKey, body) =>
		assertCitedExcerptsExist(client, body.citations),
	afterDraftSaved: (client, { body, revisionId }) =>
		syncRevisionCitations(client, revisionId, body.citations),
	async assertReadyForReview(body, { client }) {
		assertNoProblems(claimProblems(body));
		await resolveScriptureReference(client, body.passage);
		await assertCitedSourcesUsable(client, body.citations);
	},
	assertReadyToPublish: (client, { body }) =>
		assertCitedEvidenceLive(client, body.citations, "A claim"),
	afterPublished: (client, { revisionId }) =>
		pinRevisionCitations(client, revisionId),
	async removeWhenEmpty(client, scopeKey) {
		const id = recordId(scopeKey);
		const [used] = await client
			.select({ claimId: claimUsages.claimId })
			.from(claimUsages)
			.where(eq(claimUsages.claimId, id))
			.limit(1);
		if (used) {
			throw new GovernanceError(
				"Content already uses this claim, so its only draft can't be thrown away.",
			);
		}
		await client.delete(claims).where(eq(claims.id, id));
	},
};

/** Every citation on one revision, for its review screen. */
export async function listRevisionCitations(
	client: DbExecutor,
	revisionId: number,
) {
	const excerptItem = alias(contentItems, "excerpt_item");
	const liveExcerpt = alias(contentRevisions, "live_excerpt");
	const pinnedExcerpt = alias(contentRevisions, "pinned_excerpt");
	const pinnedSource = alias(contentRevisions, "pinned_source");
	return client
		.select({
			excerptContentItemId: excerptItem.id,
			excerptId: citations.excerptId,
			excerptTitle: excerptItem.title,
			id: citations.id,
			liveExcerptNumber: liveExcerpt.number,
			liveExcerptRevisionId: liveExcerpt.id,
			locator: citations.locator,
			pinnedExcerptNumber: pinnedExcerpt.number,
			pinnedSourceNumber: pinnedSource.number,
			position: citations.position,
			strength: citations.strength,
		})
		.from(citations)
		.innerJoin(
			excerptItem,
			and(
				eq(excerptItem.kind, "source_excerpt"),
				eq(excerptItem.scopeKey, sql`${citations.excerptId}::text`),
			),
		)
		.leftJoin(liveExcerpt, eq(liveExcerpt.id, excerptItem.liveRevisionId))
		.leftJoin(
			pinnedExcerpt,
			eq(pinnedExcerpt.id, citations.pinnedExcerptRevisionId),
		)
		.leftJoin(
			pinnedSource,
			eq(pinnedSource.id, citations.pinnedSourceRevisionId),
		)
		.where(eq(citations.contentRevisionId, revisionId))
		.orderBy(citations.position);
}
