import type { RichTextDocument } from "@berean-study/rich-text-editor/document";
import { and, count, desc, eq, inArray, isNull, lt } from "drizzle-orm";

import type { db } from "./index";
import { getQuotedPassageIds, toSearchText } from "./prayer-journal";
import {
	parseStoredRichText,
	serializeRichTextDocument,
} from "./rich-text-storage";
import { passages } from "./schema/passages";
import { prayerPassages } from "./schema/prayer_passages";
import { prayerReflections } from "./schema/prayer_reflections";
import { prayerUpdates } from "./schema/prayer_updates";
import { prayers } from "./schema/prayers";
import { reflectionPassages } from "./schema/reflection_passages";

type DbClient = typeof db;

export type LinkedPassage = { id: number; title: string | null };

export type CreatePrayerInput = {
	category?: string | null;
	content: RichTextDocument;
	prayingFor?: string | null;
	title: string;
};
export type UpdatePrayerInput = CreatePrayerInput & { id: number };

export type PrayerSummary = {
	category: string | null;
	content: RichTextDocument;
	createdAt: Date;
	id: number;
	passages: LinkedPassage[];
	prayingFor: string | null;
	reflectionCount: number;
	title: string;
	updateCount: number;
	updatedAt: Date;
};

export type PrayerUpdate = {
	createdAt: Date;
	id: number;
	prayerId: number;
	text: string;
};

export type PrayerDetail = PrayerSummary & { updates: PrayerUpdate[] };

/** A prayer the member has carried for a while without looking back on it. */
export type PrayerReadyForReflection = {
	createdAt: Date;
	id: number;
	title: string;
	updateCount: number;
};

export type Reflection = {
	content: RichTextDocument;
	createdAt: Date;
	id: number;
	passages: LinkedPassage[];
	/** Null for a free reflection, or when its prayer was deleted. */
	prayer: { createdAt: Date; id: number; title: string } | null;
	prompt: string | null;
};

export type SaveReflectionInput = {
	content: RichTextDocument;
	prayerId?: number | null;
	prompt?: string | null;
};

const prayerColumns = {
	category: prayers.category,
	content: prayers.content,
	createdAt: prayers.createdAt,
	id: prayers.id,
	prayingFor: prayers.prayingFor,
	title: prayers.title,
	updatedAt: prayers.updatedAt,
};

export async function listPrayers(
	db: DbClient,
	userId: string,
): Promise<PrayerSummary[]> {
	const rows = await db
		.select(prayerColumns)
		.from(prayers)
		.where(eq(prayers.userId, userId))
		.orderBy(desc(prayers.updatedAt), desc(prayers.id));
	return withPrayerCounts(db, rows);
}

export async function getPrayer(
	db: DbClient,
	userId: string,
	id: number,
): Promise<PrayerDetail | null> {
	const [row] = await db
		.select(prayerColumns)
		.from(prayers)
		.where(and(eq(prayers.id, id), eq(prayers.userId, userId)));
	if (!row) return null;

	const [[prayer], updates] = await Promise.all([
		withPrayerCounts(db, [row]),
		db
			.select()
			.from(prayerUpdates)
			.where(eq(prayerUpdates.prayerId, id))
			.orderBy(desc(prayerUpdates.createdAt), desc(prayerUpdates.id)),
	]);
	if (!prayer) return null;
	return { ...prayer, updates };
}

export async function createPrayer(
	db: DbClient,
	userId: string,
	input: CreatePrayerInput,
): Promise<PrayerDetail> {
	const id = await db.transaction(async (tx) => {
		const [created] = await tx
			.insert(prayers)
			.values({
				category: input.category ?? null,
				content: serializeRichTextDocument(input.content),
				prayingFor: input.prayingFor ?? null,
				searchText: toSearchText(input.content),
				title: input.title,
				userId,
			})
			.returning({ id: prayers.id });
		if (!created) throw new Error("Unable to create prayer.");
		await replacePrayerPassages(tx, created.id, input.content);
		return created.id;
	});
	const prayer = await getPrayer(db, userId, id);
	if (!prayer) throw new Error("Unable to load the new prayer.");
	return prayer;
}

/**
 * Saves a prayer's edits. Its linked passages are rebuilt from the verse
 * blocks in the body, so a passage linked by hand in the old editor (and not
 * quoted in the body) is dropped here.
 */
export async function updatePrayer(
	db: DbClient,
	userId: string,
	input: UpdatePrayerInput,
): Promise<PrayerDetail | null> {
	const updated = await db.transaction(async (tx) => {
		const [prayer] = await tx
			.update(prayers)
			.set({
				category: input.category ?? null,
				content: serializeRichTextDocument(input.content),
				prayingFor: input.prayingFor ?? null,
				searchText: toSearchText(input.content),
				title: input.title,
			})
			.where(and(eq(prayers.id, input.id), eq(prayers.userId, userId)))
			.returning({ id: prayers.id });
		if (!prayer) return false;
		await replacePrayerPassages(tx, prayer.id, input.content);
		return true;
	});
	return updated ? getPrayer(db, userId, input.id) : null;
}

/** Deletes a prayer. Its reflections are kept as free reflections. */
export async function deletePrayer(db: DbClient, userId: string, id: number) {
	const [deleted] = await db
		.delete(prayers)
		.where(and(eq(prayers.id, id), eq(prayers.userId, userId)))
		.returning({ id: prayers.id });
	return Boolean(deleted);
}

export async function addPrayerUpdate(
	db: DbClient,
	userId: string,
	input: { prayerId: number; text: string },
): Promise<PrayerUpdate | null> {
	if (!(await ownsPrayer(db, userId, input.prayerId))) return null;
	const [update] = await db
		.insert(prayerUpdates)
		.values({ prayerId: input.prayerId, text: input.text })
		.returning();
	return update ?? null;
}

export async function deletePrayerUpdate(
	db: DbClient,
	userId: string,
	input: { id: number; prayerId: number },
) {
	if (!(await ownsPrayer(db, userId, input.prayerId))) return false;
	const [deleted] = await db
		.delete(prayerUpdates)
		.where(
			and(
				eq(prayerUpdates.id, input.id),
				eq(prayerUpdates.prayerId, input.prayerId),
			),
		)
		.returning({ id: prayerUpdates.id });
	return Boolean(deleted);
}

/**
 * Prayers older than `olderThanDays` that have no reflection yet, oldest
 * first, so the Reflections tab can suggest looking back on them.
 */
export async function listPrayersReadyForReflection(
	db: DbClient,
	userId: string,
	{
		limit = 5,
		olderThanDays = 21,
	}: { limit?: number; olderThanDays?: number } = {},
): Promise<PrayerReadyForReflection[]> {
	const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
	const rows = await db
		.select({
			createdAt: prayers.createdAt,
			id: prayers.id,
			title: prayers.title,
		})
		.from(prayers)
		.leftJoin(prayerReflections, eq(prayerReflections.prayerId, prayers.id))
		.where(
			and(
				eq(prayers.userId, userId),
				lt(prayers.createdAt, cutoff),
				isNull(prayerReflections.id),
			),
		)
		.orderBy(prayers.createdAt, prayers.id)
		.limit(limit);
	const updateCounts = await countByPrayer(
		db,
		prayerUpdates,
		rows.map((row) => row.id),
	);
	return rows.map((row) => ({
		...row,
		updateCount: updateCounts.get(row.id) ?? 0,
	}));
}

/** Every reflection, newest first, optionally only those on one prayer. */
export async function listReflections(
	db: DbClient,
	userId: string,
	{ prayerId }: { prayerId?: number } = {},
): Promise<Reflection[]> {
	const conditions = [eq(prayerReflections.userId, userId)];
	if (prayerId) conditions.push(eq(prayerReflections.prayerId, prayerId));
	const rows = await selectReflections(db)
		.where(and(...conditions))
		.orderBy(desc(prayerReflections.createdAt), desc(prayerReflections.id));
	return withReflectionPassages(db, rows);
}

export async function getReflection(
	db: DbClient,
	userId: string,
	id: number,
): Promise<Reflection | null> {
	const rows = await selectReflections(db).where(
		and(eq(prayerReflections.id, id), eq(prayerReflections.userId, userId)),
	);
	const [reflection] = await withReflectionPassages(db, rows);
	return reflection ?? null;
}

/** Returns null when the linked prayer doesn't belong to the member. */
export async function createReflection(
	db: DbClient,
	userId: string,
	input: SaveReflectionInput,
): Promise<Reflection | null> {
	if (input.prayerId && !(await ownsPrayer(db, userId, input.prayerId)))
		return null;
	const id = await db.transaction(async (tx) => {
		const [created] = await tx
			.insert(prayerReflections)
			.values({
				content: serializeRichTextDocument(input.content),
				prayerId: input.prayerId ?? null,
				prompt: input.prompt ?? null,
				searchText: toSearchText(input.content),
				userId,
			})
			.returning({ id: prayerReflections.id });
		if (!created) throw new Error("Unable to create reflection.");
		await replaceReflectionPassages(tx, created.id, input.content);
		return created.id;
	});
	return getReflection(db, userId, id);
}

export async function updateReflection(
	db: DbClient,
	userId: string,
	input: SaveReflectionInput & { id: number },
): Promise<Reflection | null> {
	if (input.prayerId && !(await ownsPrayer(db, userId, input.prayerId)))
		return null;
	const updated = await db.transaction(async (tx) => {
		const [reflection] = await tx
			.update(prayerReflections)
			.set({
				content: serializeRichTextDocument(input.content),
				prayerId: input.prayerId ?? null,
				prompt: input.prompt ?? null,
				searchText: toSearchText(input.content),
			})
			.where(
				and(
					eq(prayerReflections.id, input.id),
					eq(prayerReflections.userId, userId),
				),
			)
			.returning({ id: prayerReflections.id });
		if (!reflection) return false;
		await replaceReflectionPassages(tx, reflection.id, input.content);
		return true;
	});
	return updated ? getReflection(db, userId, input.id) : null;
}

export async function deleteReflection(
	db: DbClient,
	userId: string,
	id: number,
) {
	const [deleted] = await db
		.delete(prayerReflections)
		.where(
			and(eq(prayerReflections.id, id), eq(prayerReflections.userId, userId)),
		)
		.returning({ id: prayerReflections.id });
	return Boolean(deleted);
}

type Transaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

async function replacePrayerPassages(
	tx: Transaction,
	prayerId: number,
	content: RichTextDocument,
) {
	const passageIds = await getQuotedPassageIds(tx, content);
	await tx.delete(prayerPassages).where(eq(prayerPassages.prayerId, prayerId));
	if (passageIds.length)
		await tx
			.insert(prayerPassages)
			.values(passageIds.map((passageId) => ({ passageId, prayerId })));
}

async function replaceReflectionPassages(
	tx: Transaction,
	reflectionId: number,
	content: RichTextDocument,
) {
	const passageIds = await getQuotedPassageIds(tx, content);
	await tx
		.delete(reflectionPassages)
		.where(eq(reflectionPassages.reflectionId, reflectionId));
	if (passageIds.length)
		await tx
			.insert(reflectionPassages)
			.values(passageIds.map((passageId) => ({ passageId, reflectionId })));
}

async function ownsPrayer(db: DbClient, userId: string, prayerId: number) {
	const [prayer] = await db
		.select({ id: prayers.id })
		.from(prayers)
		.where(and(eq(prayers.id, prayerId), eq(prayers.userId, userId)));
	return Boolean(prayer);
}

async function withPrayerCounts(
	db: DbClient,
	rows: (Omit<
		PrayerSummary,
		"content" | "passages" | "reflectionCount" | "updateCount"
	> & {
		content: string;
	})[],
): Promise<PrayerSummary[]> {
	const ids = rows.map((row) => row.id);
	const [reflectionCounts, updateCounts, linked] = await Promise.all([
		countByPrayer(db, prayerReflections, ids),
		countByPrayer(db, prayerUpdates, ids),
		ids.length
			? db
					.select({
						id: passages.id,
						prayerId: prayerPassages.prayerId,
						title: passages.title,
					})
					.from(prayerPassages)
					.innerJoin(passages, eq(passages.id, prayerPassages.passageId))
					.where(inArray(prayerPassages.prayerId, ids))
			: [],
	]);
	const passagesByPrayer = groupBy(linked, (row) => row.prayerId);
	return rows.map((row) => ({
		...row,
		content: parseStoredRichText(row.content),
		passages: (passagesByPrayer.get(row.id) ?? []).map(({ id, title }) => ({
			id,
			title,
		})),
		reflectionCount: reflectionCounts.get(row.id) ?? 0,
		updateCount: updateCounts.get(row.id) ?? 0,
	}));
}

async function countByPrayer(
	db: DbClient,
	table: typeof prayerReflections | typeof prayerUpdates,
	prayerIds: number[],
) {
	if (prayerIds.length === 0) return new Map<number, number>();
	const rows = await db
		.select({ prayerId: table.prayerId, total: count() })
		.from(table)
		.where(inArray(table.prayerId, prayerIds))
		.groupBy(table.prayerId);
	return new Map(
		rows.flatMap((row) =>
			row.prayerId === null ? [] : [[row.prayerId, Number(row.total)] as const],
		),
	);
}

function selectReflections(db: DbClient) {
	return db
		.select({
			content: prayerReflections.content,
			createdAt: prayerReflections.createdAt,
			id: prayerReflections.id,
			prayerCreatedAt: prayers.createdAt,
			prayerId: prayers.id,
			prayerTitle: prayers.title,
			prompt: prayerReflections.prompt,
		})
		.from(prayerReflections)
		.leftJoin(prayers, eq(prayers.id, prayerReflections.prayerId))
		.$dynamic();
}

async function withReflectionPassages(
	db: DbClient,
	rows: Awaited<ReturnType<typeof selectReflections>>,
): Promise<Reflection[]> {
	const ids = rows.map((row) => row.id);
	const linked = ids.length
		? await db
				.select({
					id: passages.id,
					reflectionId: reflectionPassages.reflectionId,
					title: passages.title,
				})
				.from(reflectionPassages)
				.innerJoin(passages, eq(passages.id, reflectionPassages.passageId))
				.where(inArray(reflectionPassages.reflectionId, ids))
		: [];
	const passagesByReflection = groupBy(linked, (row) => row.reflectionId);
	return rows.map((row) => ({
		content: parseStoredRichText(row.content),
		createdAt: row.createdAt,
		id: row.id,
		passages: (passagesByReflection.get(row.id) ?? []).map(({ id, title }) => ({
			id,
			title,
		})),
		prayer:
			row.prayerId !== null && row.prayerTitle !== null && row.prayerCreatedAt
				? {
						createdAt: row.prayerCreatedAt,
						id: row.prayerId,
						title: row.prayerTitle,
					}
				: null,
		prompt: row.prompt,
	}));
}

function groupBy<T, K>(items: readonly T[], key: (item: T) => K) {
	const groups = new Map<K, T[]>();
	for (const item of items) {
		const groupKey = key(item);
		const group = groups.get(groupKey) ?? [];
		group.push(item);
		groups.set(groupKey, group);
	}
	return groups;
}
