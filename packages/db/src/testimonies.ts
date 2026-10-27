import type { RichTextDocument } from "@berean-study/rich-text-editor/document";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import type { db } from "./index";
import { getQuotedPassageIds, toSearchText } from "./prayer-journal";
import {
	parseStoredRichText,
	serializeRichTextDocument,
} from "./rich-text-storage";
import { communityPosts } from "./schema/community_posts";
import { passages } from "./schema/passages";
import { testimonies } from "./schema/testimonies";
import { testimonyNotes } from "./schema/testimony_notes";
import { testimonyPassages } from "./schema/testimony_passages";
import { testimonyPrayers } from "./schema/testimony_prayers";

type DbClient = typeof db;

export type Testimony = {
	content: RichTextDocument;
	createdAt: Date;
	/** When the story happened, as "YYYY-MM-01"; null when not given. */
	happenedOn: string | null;
	id: number;
	passages: { id: number; title: string | null }[];
	prayerCount: number;
	noteCount: number;
	/**
	 * True while the testimony has a Community post. This is read from the
	 * post itself rather than stored on the testimony.
	 *
	 * Known gap: there is no way to take a post down yet, so once shared a
	 * testimony can't be made private again from the Prayer Journal.
	 */
	sharedToCommunity: boolean;
	title: string;
	updatedAt: Date;
};

export type SaveTestimonyInput = {
	content: RichTextDocument;
	happenedOn?: string | null;
	title: string;
};

export async function createTestimony(
	db: DbClient,
	userId: string,
	input: SaveTestimonyInput,
): Promise<Testimony> {
	const id = await db.transaction(async (tx) => {
		const [testimony] = await tx
			.insert(testimonies)
			.values({
				content: serializeRichTextDocument(input.content),
				happenedOn: input.happenedOn ?? null,
				searchText: toSearchText(input.content),
				title: input.title,
				userId,
			})
			.returning({ id: testimonies.id });
		if (!testimony) throw new Error("Unable to create testimony.");
		await replaceTestimonyPassages(tx, testimony.id, input.content);
		return testimony.id;
	});
	const testimony = await getTestimony(db, userId, id);
	if (!testimony) throw new Error("Unable to load the new testimony.");
	return testimony;
}

export async function getTestimony(
	db: DbClient,
	userId: string,
	id: number,
): Promise<Testimony | null> {
	const rows = await db
		.select()
		.from(testimonies)
		.where(and(eq(testimonies.id, id), eq(testimonies.userId, userId)));
	const [testimony] = await withTestimonyDetails(db, userId, rows);
	return testimony ?? null;
}

export async function updateTestimony(
	db: DbClient,
	userId: string,
	input: SaveTestimonyInput & { id: number },
): Promise<Testimony | null> {
	const updated = await db.transaction(async (tx) => {
		const [testimony] = await tx
			.update(testimonies)
			.set({
				content: serializeRichTextDocument(input.content),
				happenedOn: input.happenedOn ?? null,
				searchText: toSearchText(input.content),
				title: input.title,
			})
			.where(and(eq(testimonies.id, input.id), eq(testimonies.userId, userId)))
			.returning({ id: testimonies.id });
		if (!testimony) return false;
		await replaceTestimonyPassages(tx, testimony.id, input.content);
		return true;
	});
	return updated ? getTestimony(db, userId, input.id) : null;
}

/** Deletes a testimony. A Community post made from it stays up. */
export async function deleteTestimony(
	db: DbClient,
	userId: string,
	id: number,
) {
	const [deleted] = await db
		.delete(testimonies)
		.where(and(eq(testimonies.id, id), eq(testimonies.userId, userId)))
		.returning({ id: testimonies.id });
	return Boolean(deleted);
}

export async function listTestimonies(db: DbClient, userId: string) {
	const rows = await db
		.select()
		.from(testimonies)
		.where(eq(testimonies.userId, userId))
		.orderBy(desc(testimonies.createdAt), desc(testimonies.id));
	return withTestimonyDetails(db, userId, rows);
}

type Transaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

async function replaceTestimonyPassages(
	tx: Transaction,
	testimonyId: number,
	content: RichTextDocument,
) {
	const passageIds = await getQuotedPassageIds(tx, content);
	await tx
		.delete(testimonyPassages)
		.where(eq(testimonyPassages.testimonyId, testimonyId));
	if (passageIds.length)
		await tx
			.insert(testimonyPassages)
			.values(passageIds.map((passageId) => ({ passageId, testimonyId })));
}

async function withTestimonyDetails(
	db: DbClient,
	userId: string,
	rows: (typeof testimonies.$inferSelect)[],
): Promise<Testimony[]> {
	if (rows.length === 0) return [];

	const ids = rows.map((testimony) => testimony.id);
	const [linkedPassages, linkedPrayers, linkedNotes, shared] =
		await Promise.all([
			db
				.select({
					testimonyId: testimonyPassages.testimonyId,
					id: passages.id,
					title: passages.title,
				})
				.from(testimonyPassages)
				.innerJoin(passages, eq(passages.id, testimonyPassages.passageId))
				.where(inArray(testimonyPassages.testimonyId, ids)),
			db
				.select({ testimonyId: testimonyPrayers.testimonyId })
				.from(testimonyPrayers)
				.where(
					and(
						eq(testimonyPrayers.userId, userId),
						inArray(testimonyPrayers.testimonyId, ids),
					),
				),
			db
				.select({ testimonyId: testimonyNotes.testimonyId })
				.from(testimonyNotes)
				.where(
					and(
						eq(testimonyNotes.userId, userId),
						inArray(testimonyNotes.testimonyId, ids),
					),
				),
			db
				.select({ testimonyId: communityPosts.sourceTestimonyId })
				.from(communityPosts)
				.where(
					and(
						eq(communityPosts.authorUserId, userId),
						inArray(communityPosts.sourceTestimonyId, ids),
						isNull(communityPosts.removedAt),
					),
				),
		]);
	const passagesByTestimony = new Map<number, Testimony["passages"]>();
	for (const passage of linkedPassages) {
		const current = passagesByTestimony.get(passage.testimonyId) ?? [];
		current.push({ id: passage.id, title: passage.title });
		passagesByTestimony.set(passage.testimonyId, current);
	}
	const prayerCounts = countByTestimony(linkedPrayers);
	const noteCounts = countByTestimony(linkedNotes);
	const sharedIds = new Set(
		shared.flatMap((post) => (post.testimonyId ? [post.testimonyId] : [])),
	);
	return rows.map(
		({ searchText: _searchText, userId: _userId, ...testimony }) => ({
			...toTestimonyDocument(testimony),
			passages: passagesByTestimony.get(testimony.id) ?? [],
			prayerCount: prayerCounts.get(testimony.id) ?? 0,
			noteCount: noteCounts.get(testimony.id) ?? 0,
			sharedToCommunity: sharedIds.has(testimony.id),
		}),
	);
}

function toTestimonyDocument<TestimonyRow extends { content: string }>(
	testimony: TestimonyRow,
) {
	return { ...testimony, content: parseStoredRichText(testimony.content) };
}

function countByTestimony(rows: { testimonyId: number }[]) {
	const counts = new Map<number, number>();
	for (const row of rows)
		counts.set(row.testimonyId, (counts.get(row.testimonyId) ?? 0) + 1);
	return counts;
}
