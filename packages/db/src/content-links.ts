import {
	contentBlockKindLabels,
	getDocumentCommentaryNodes,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";
import { and, eq, inArray, like, max, sql } from "drizzle-orm";

import type { VersePoint } from "./commentary-body";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { contentItems } from "./schema/content_items";
import { contentPassages } from "./schema/content_passages";
import { contentRevisions } from "./schema/content_revisions";
import { contentSourceLinks } from "./schema/content_source_links";
import { readPassageKey, resolvePassage } from "./scripture-reference";

/*
 * What a revision points at besides its citations: other reviewed content placed in
 * its writing, the verses it's about, and sources it names directly.
 */

export type LinkedContent = {
	kind: string;
	label: string;
	scopeKey: string;
};

/** Blocks placed in writing, and Greek or Hebrew words that open a note. */
export function linkedContentIn(documents: readonly RichTextDocument[]) {
	return documents.flatMap((document): LinkedContent[] => {
		const { contentBlocks, originalTerms } =
			getDocumentCommentaryNodes(document);
		return [
			...contentBlocks.map(({ kind, label, scopeKey }) => ({
				kind,
				label: `${contentBlockKindLabels[kind]}: ${label}`,
				scopeKey,
			})),
			...originalTerms.flatMap(({ noteScopeKey, word }) =>
				noteScopeKey
					? [
							{
								kind: "original_language_note",
								label: `The note on ${word}`,
								scopeKey: noteScopeKey,
							},
						]
					: [],
			),
		];
	});
}

async function findLinkedItem(client: DbExecutor, link: LinkedContent) {
	const [item] = await client
		.select({ liveRevisionId: contentItems.liveRevisionId })
		.from(contentItems)
		.where(
			and(
				eq(contentItems.kind, link.kind),
				eq(contentItems.scopeKey, link.scopeKey),
			),
		);
	return item ?? null;
}

export async function assertLinkedContentExists(
	client: DbExecutor,
	links: readonly LinkedContent[],
) {
	for (const link of links) {
		if (!(await findLinkedItem(client, link))) {
			throw new GovernanceError(`"${link.label}" no longer exists.`);
		}
	}
}

/** Nothing goes live before what it places in front of readers. */
export async function assertLinkedContentLive(
	client: DbExecutor,
	links: readonly LinkedContent[],
	what: string,
) {
	for (const link of links) {
		const item = await findLinkedItem(client, link);
		if (!item?.liveRevisionId) {
			throw new GovernanceError(
				`Publish "${link.label}" first. ${what} can't go live before something it shows readers.`,
			);
		}
	}
}

/**
 * Refuses taking down content that published writing shows. Its address only appears
 * in a body where it was placed, and withdrawing is rare enough to read them all.
 */
export async function assertNotShownInPublishedContent(
	client: DbExecutor,
	scopeKey: string,
) {
	const [using] = await client
		.select({ title: contentItems.title })
		.from(contentRevisions)
		.innerJoin(
			contentItems,
			eq(contentItems.id, contentRevisions.contentItemId),
		)
		.where(
			and(
				eq(contentRevisions.status, "published"),
				like(sql`${contentRevisions.body}::text`, `%"${scopeKey}"%`),
			),
		)
		.limit(1);
	if (using) {
		throw new GovernanceError(
			`"${using.title}" shows this to readers, so it can't be withdrawn. Publish a corrected revision instead.`,
		);
	}
}

/** A passage a revision is about: a checked key, or a reference as the writer typed it. */
export type RevisionPassage = {
	reference: { key: string } | { text: string };
	showsToReaders?: boolean;
};

/**
 * Keeps the mirror of which verses a revision is about in step with its body. A
 * draft can hold a reference that isn't right yet: it's left out here, and sending
 * the draft for review is what refuses it.
 */
export async function syncRevisionPassages(
	client: DbExecutor,
	revisionId: number,
	entries: readonly RevisionPassage[],
) {
	await client
		.delete(contentPassages)
		.where(eq(contentPassages.contentRevisionId, revisionId));

	const rows: (typeof contentPassages.$inferInsert)[] = [];
	for (const { reference, showsToReaders = true } of entries) {
		const resolved = await resolveLeniently(client, reference);
		if (!resolved) continue;
		const { bookId, passage } = resolved;
		rows.push({
			bookId,
			contentRevisionId: revisionId,
			fromChapter: passage.from.chapter,
			fromVerse: passage.from.verse,
			position: rows.length + 1,
			showsToReaders,
			toChapter: passage.to.chapter,
			toVerse: passage.to.verse,
		});
	}
	if (rows.length > 0) await client.insert(contentPassages).values(rows);
}

async function resolveLeniently(
	client: DbExecutor,
	reference: RevisionPassage["reference"],
) {
	try {
		return "key" in reference
			? await readPassageKey(client, reference.key)
			: await resolvePassage(client, reference.text);
	} catch (error) {
		if (error instanceof GovernanceError) return null;
		throw error;
	}
}

/**
 * What's attached to some verses. `latest` is each item's newest revision, whatever
 * its status, for staff. `live` is only what readers can see right now.
 */
export async function contentAtPassage(
	client: DbExecutor,
	input: { bookId: number; from: VersePoint; to: VersePoint },
	options: { kinds: readonly string[]; revision: "latest" | "live" },
) {
	if (options.kinds.length === 0) return [];
	const newest = client
		.select({
			contentItemId: contentRevisions.contentItemId,
			number: max(contentRevisions.number).as("newest_number"),
		})
		.from(contentRevisions)
		.groupBy(contentRevisions.contentItemId)
		.as("newest");
	const { from, to } = input;
	const rows = await client
		.select({
			body: contentRevisions.body,
			contentItemId: contentItems.id,
			kind: contentItems.kind,
			liveRevisionId: contentItems.liveRevisionId,
			number: contentRevisions.number,
			revisionId: contentRevisions.id,
			scopeKey: contentItems.scopeKey,
			showsToReaders: contentPassages.showsToReaders,
			status: contentRevisions.status,
			title: contentItems.title,
		})
		.from(contentPassages)
		.innerJoin(
			contentRevisions,
			eq(contentRevisions.id, contentPassages.contentRevisionId),
		)
		.innerJoin(
			contentItems,
			eq(contentItems.id, contentRevisions.contentItemId),
		)
		.innerJoin(newest, eq(newest.contentItemId, contentItems.id))
		.where(
			and(
				eq(contentPassages.bookId, input.bookId),
				sql`(${contentPassages.fromChapter}, ${contentPassages.fromVerse}) <= (${to.chapter}, ${to.verse})`,
				sql`(${contentPassages.toChapter}, ${contentPassages.toVerse}) >= (${from.chapter}, ${from.verse})`,
				inArray(contentItems.kind, [...options.kinds]),
				options.revision === "live"
					? and(
							eq(contentRevisions.id, contentItems.liveRevisionId),
							eq(contentPassages.showsToReaders, true),
						)
					: eq(contentRevisions.number, newest.number),
			),
		)
		.orderBy(contentItems.title);

	const byItem = new Map<number, (typeof rows)[number]>();
	for (const row of rows) {
		const seen = byItem.get(row.contentItemId);
		// A link shown to readers from any of its ends counts as shown here.
		if (!seen || (row.showsToReaders && !seen.showsToReaders)) {
			byItem.set(row.contentItemId, row);
		}
	}
	return [...byItem.values()];
}

export async function syncRevisionSources(
	client: DbExecutor,
	revisionId: number,
	sourceIds: readonly number[],
) {
	await client
		.delete(contentSourceLinks)
		.where(eq(contentSourceLinks.contentRevisionId, revisionId));
	const unique = [...new Set(sourceIds)];
	if (unique.length === 0) return;
	await client
		.insert(contentSourceLinks)
		.values(
			unique.map((sourceId) => ({ contentRevisionId: revisionId, sourceId })),
		);
}

/** A merged source keeps what named it: those rows follow to the source that stays. */
export async function moveSourceLinks(
	client: DbExecutor,
	input: { fromSourceId: number; toSourceId: number },
) {
	const rows = await client
		.select({ revisionId: contentSourceLinks.contentRevisionId })
		.from(contentSourceLinks)
		.where(eq(contentSourceLinks.sourceId, input.fromSourceId));
	if (rows.length === 0) return;
	await client
		.delete(contentSourceLinks)
		.where(eq(contentSourceLinks.sourceId, input.fromSourceId));
	await client
		.insert(contentSourceLinks)
		.values(
			rows.map(({ revisionId }) => ({
				contentRevisionId: revisionId,
				sourceId: input.toSourceId,
			})),
		)
		.onConflictDoNothing();
}

export async function revisionsNamingSource(
	client: DbExecutor,
	sourceId: number,
	statuses: readonly string[],
) {
	return client
		.select({
			contentItemId: contentItems.id,
			kind: contentItems.kind,
			number: contentRevisions.number,
			revisionId: contentRevisions.id,
			status: contentRevisions.status,
			title: contentItems.title,
		})
		.from(contentSourceLinks)
		.innerJoin(
			contentRevisions,
			eq(contentRevisions.id, contentSourceLinks.contentRevisionId),
		)
		.innerJoin(
			contentItems,
			eq(contentItems.id, contentRevisions.contentItemId),
		)
		.where(
			and(
				eq(contentSourceLinks.sourceId, sourceId),
				inArray(contentRevisions.status, [...statuses] as never[]),
			),
		);
}
