import { and, eq, inArray } from "drizzle-orm";

import type { DbExecutor } from "./db-executor";
import type { CitationStrength } from "./evidence-body";
import { GovernanceError } from "./governance-error";
import { citations } from "./schema/citations";
import { contentItems } from "./schema/content_items";
import { sourceExcerpts } from "./schema/source_excerpts";
import { sources } from "./schema/sources";

export type CitationEntry = {
	excerptId: number;
	locator: string;
	strength: CitationStrength;
};

/** The content item behind an evidence record, with the revision live right now, if any. */
export async function getRecordItem(
	client: DbExecutor,
	kind: "source" | "source_excerpt",
	id: number,
) {
	const [item] = await client
		.select({
			id: contentItems.id,
			liveRevisionId: contentItems.liveRevisionId,
			title: contentItems.title,
		})
		.from(contentItems)
		.where(
			and(eq(contentItems.kind, kind), eq(contentItems.scopeKey, String(id))),
		);
	return item ?? null;
}

/** A retired source can stay where it's already published, but nothing new can rest on it. */
export async function assertSourceUsable(client: DbExecutor, sourceId: number) {
	const [source] = await client
		.select({ status: sources.status })
		.from(sources)
		.where(eq(sources.id, sourceId));
	if (!source) throw new GovernanceError("This source no longer exists.");
	if (source.status === "retired") {
		throw new GovernanceError(
			"This source has been retired, so it can't be used.",
		);
	}
	if (source.status === "merged") {
		throw new GovernanceError(
			"This source was merged into another one. Use that one instead.",
		);
	}
}

/** The excerpts cited, along with the source each comes from. */
async function citedExcerpts(
	client: DbExecutor,
	entries: readonly CitationEntry[],
) {
	const ids = [...new Set(entries.map(({ excerptId }) => excerptId))];
	if (ids.length === 0) return [];
	return client
		.select({ id: sourceExcerpts.id, sourceId: sourceExcerpts.sourceId })
		.from(sourceExcerpts)
		.where(inArray(sourceExcerpts.id, ids));
}

export async function assertCitedExcerptsExist(
	client: DbExecutor,
	entries: readonly CitationEntry[],
) {
	const known = new Set(
		(await citedExcerpts(client, entries)).map(({ id }) => id),
	);
	if (entries.some(({ excerptId }) => !known.has(excerptId))) {
		throw new GovernanceError(
			"A citation here points to an excerpt that no longer exists.",
		);
	}
}

export async function assertCitedSourcesUsable(
	client: DbExecutor,
	entries: readonly CitationEntry[],
) {
	for (const { sourceId } of await citedExcerpts(client, entries)) {
		await assertSourceUsable(client, sourceId);
	}
}

/** Nothing goes live before what it rests on. */
export async function assertCitedEvidenceLive(
	client: DbExecutor,
	entries: readonly CitationEntry[],
	what: string,
) {
	for (const { id, sourceId } of await citedExcerpts(client, entries)) {
		await assertSourceUsable(client, sourceId);
		const excerpt = await getRecordItem(client, "source_excerpt", id);
		const source = await getRecordItem(client, "source", sourceId);
		if (!excerpt?.liveRevisionId || !source?.liveRevisionId) {
			throw new GovernanceError(
				`Publish "${excerpt?.title ?? "the excerpt"}" and its source first. ${what} can't go live before what it rests on.`,
			);
		}
	}
}

/** Citations are checked as part of what cites them, so they follow its draft exactly. */
export async function syncRevisionCitations(
	client: DbExecutor,
	revisionId: number,
	entries: readonly CitationEntry[],
) {
	await client
		.delete(citations)
		.where(eq(citations.contentRevisionId, revisionId));
	if (entries.length === 0) return;
	await client.insert(citations).values(
		entries.map(({ excerptId, locator, strength }, index) => ({
			contentRevisionId: revisionId,
			excerptId,
			locator: locator.trim() || null,
			position: index + 1,
			strength,
		})),
	);
}

/** From here this revision keeps pointing to the versions it was published with. */
export async function pinRevisionCitations(
	client: DbExecutor,
	revisionId: number,
) {
	const rows = await client
		.select({
			excerptId: citations.excerptId,
			id: citations.id,
			sourceId: sourceExcerpts.sourceId,
		})
		.from(citations)
		.innerJoin(sourceExcerpts, eq(sourceExcerpts.id, citations.excerptId))
		.where(eq(citations.contentRevisionId, revisionId));
	for (const { excerptId, id, sourceId } of rows) {
		const excerpt = await getRecordItem(client, "source_excerpt", excerptId);
		const source = await getRecordItem(client, "source", sourceId);
		await client
			.update(citations)
			.set({
				pinnedExcerptRevisionId: excerpt?.liveRevisionId ?? null,
				pinnedSourceRevisionId: source?.liveRevisionId ?? null,
			})
			.where(eq(citations.id, id));
	}
}
