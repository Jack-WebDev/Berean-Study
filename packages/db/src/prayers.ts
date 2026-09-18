import { and, count, desc, eq, inArray } from "drizzle-orm";

import type { createDb } from "./index";
import { prayerPassages } from "./schema/prayer_passages";
import { prayerReflections } from "./schema/prayer_reflections";
import { prayers } from "./schema/prayers";

type DbClient = ReturnType<typeof createDb>;

export type PrayerVisibility = "private" | "public";

export type CreatePrayerInput = {
	category?: string | null;
	content: string;
	passageId?: number | null;
	title: string;
};
export type UpdatePrayerInput = CreatePrayerInput & { id: number };

export type PrayerSummary = {
	category: string | null;
	content: string;
	createdAt: Date;
	id: number;
	passageId: number | null;
	reflectionCount: number;
	title: string;
	updatedAt: Date;
};

export async function listPrayers(db: DbClient, userId: string) {
	const rows = await db
		.select({
			category: prayers.category,
			content: prayers.content,
			createdAt: prayers.createdAt,
			id: prayers.id,
			title: prayers.title,
			updatedAt: prayers.updatedAt,
		})
		.from(prayers)
		.where(eq(prayers.userId, userId))
		.orderBy(desc(prayers.updatedAt), desc(prayers.id));

	const reflectionCounts = await getReflectionCounts(
		db,
		rows.map((prayer) => prayer.id),
	);
	const passageIds = await getPassageIds(
		db,
		rows.map((prayer) => prayer.id),
	);

	return rows.map((prayer) => ({
		...prayer,
		passageId: passageIds.get(prayer.id) ?? null,
		reflectionCount: reflectionCounts.get(prayer.id) ?? 0,
	}));
}

export async function getPrayer(db: DbClient, userId: string, id: number) {
	const [prayer] = await db
		.select({
			category: prayers.category,
			content: prayers.content,
			createdAt: prayers.createdAt,
			id: prayers.id,
			title: prayers.title,
			updatedAt: prayers.updatedAt,
		})
		.from(prayers)
		.where(and(eq(prayers.id, id), eq(prayers.userId, userId)));
	if (!prayer) return null;
	const [passage] = await db
		.select({ passageId: prayerPassages.passageId })
		.from(prayerPassages)
		.where(eq(prayerPassages.prayerId, id));
	const reflectionCounts = await getReflectionCounts(db, [id]);
	return {
		...prayer,
		passageId: passage?.passageId ?? null,
		reflectionCount: reflectionCounts.get(id) ?? 0,
	};
}

export async function updatePrayer(
	db: DbClient,
	userId: string,
	input: UpdatePrayerInput,
) {
	const [prayer] = await db
		.update(prayers)
		.set({
			category: input.category,
			content: input.content,
			title: input.title,
		})
		.where(and(eq(prayers.id, input.id), eq(prayers.userId, userId)))
		.returning();
	if (!prayer) return null;
	if (input.passageId !== undefined) {
		await db
			.delete(prayerPassages)
			.where(eq(prayerPassages.prayerId, prayer.id));
		if (input.passageId) {
			await db
				.insert(prayerPassages)
				.values({ passageId: input.passageId, prayerId: prayer.id });
		}
	}
	return getPrayer(db, userId, prayer.id);
}

export async function createPrayer(
	db: DbClient,
	userId: string,
	input: CreatePrayerInput,
): Promise<PrayerSummary> {
	const [prayer] = await db
		.insert(prayers)
		.values({
			category: input.category,
			content: input.content,
			title: input.title,
			userId,
		})
		.returning();

	if (!prayer) throw new Error("Unable to create prayer.");
	if (input.passageId) {
		await db
			.insert(prayerPassages)
			.values({ passageId: input.passageId, prayerId: prayer.id });
	}
	return { ...prayer, passageId: input.passageId ?? null, reflectionCount: 0 };
}

async function getReflectionCounts(db: DbClient, prayerIds: number[]) {
	if (prayerIds.length === 0) return new Map<number, number>();
	const rows = await db
		.select({ count: count(), prayerId: prayerReflections.prayerId })
		.from(prayerReflections)
		.where(inArray(prayerReflections.prayerId, prayerIds))
		.groupBy(prayerReflections.prayerId);
	return new Map(rows.map((row) => [row.prayerId, Number(row.count)]));
}

async function getPassageIds(db: DbClient, prayerIds: number[]) {
	if (prayerIds.length === 0) return new Map<number, number>();
	const rows = await db
		.select({
			passageId: prayerPassages.passageId,
			prayerId: prayerPassages.prayerId,
		})
		.from(prayerPassages)
		.where(inArray(prayerPassages.prayerId, prayerIds));
	return new Map(rows.map((row) => [row.prayerId, row.passageId]));
}
