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

export type PrayerReflection = {
	content: string;
	createdAt: Date;
	id: number;
	prayerId: number;
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

	if (!prayer) {
		return null;
	}

	const [[passage], reflections] = await Promise.all([
		db
			.select({
				passageId: prayerPassages.passageId,
			})
			.from(prayerPassages)
			.where(eq(prayerPassages.prayerId, id))
			.limit(1),

		listPrayerReflections(db, userId, id),
	]);

	return {
		...prayer,
		passageId: passage?.passageId ?? null,
		reflectionCount: reflections.length,
		reflections,
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

export async function listPrayerReflections(
	db: DbClient,
	userId: string,
	prayerId: number,
): Promise<PrayerReflection[]> {
	return db
		.select({
			content: prayerReflections.content,
			createdAt: prayerReflections.createdAt,
			id: prayerReflections.id,
			prayerId: prayerReflections.prayerId,
		})
		.from(prayerReflections)
		.innerJoin(prayers, eq(prayerReflections.prayerId, prayers.id))
		.where(
			and(eq(prayerReflections.prayerId, prayerId), eq(prayers.userId, userId)),
		)
		.orderBy(desc(prayerReflections.createdAt), desc(prayerReflections.id));
}

export async function getPrayerReflection(
	db: DbClient,
	userId: string,
	prayerId: number,
	reflectionId: number,
): Promise<PrayerReflection | null> {
	const [reflection] = await db
		.select({
			content: prayerReflections.content,
			createdAt: prayerReflections.createdAt,
			id: prayerReflections.id,
			prayerId: prayerReflections.prayerId,
		})
		.from(prayerReflections)
		.innerJoin(prayers, eq(prayerReflections.prayerId, prayers.id))
		.where(
			and(
				eq(prayerReflections.id, reflectionId),
				eq(prayerReflections.prayerId, prayerId),
				eq(prayers.userId, userId),
			),
		);
	return reflection ?? null;
}

export async function createPrayerReflection(
	db: DbClient,
	userId: string,
	input: { content: string; prayerId: number },
): Promise<PrayerReflection | null> {
	const [prayer] = await db
		.select({ id: prayers.id })
		.from(prayers)
		.where(and(eq(prayers.id, input.prayerId), eq(prayers.userId, userId)));
	if (!prayer) return null;
	const [reflection] = await db
		.insert(prayerReflections)
		.values({ content: input.content, prayerId: prayer.id })
		.returning();
	return reflection ?? null;
}

export async function updatePrayerReflection(
	db: DbClient,
	userId: string,
	input: { content: string; prayerId: number; reflectionId: number },
): Promise<PrayerReflection | null> {
	const reflection = await getPrayerReflection(
		db,
		userId,
		input.prayerId,
		input.reflectionId,
	);
	if (!reflection) return null;
	const [updated] = await db
		.update(prayerReflections)
		.set({ content: input.content })
		.where(eq(prayerReflections.id, input.reflectionId))
		.returning();
	return updated ?? null;
}

export async function deletePrayerReflection(
	db: DbClient,
	userId: string,
	prayerId: number,
	reflectionId: number,
) {
	const reflection = await getPrayerReflection(
		db,
		userId,
		prayerId,
		reflectionId,
	);
	if (!reflection) return false;
	const [deleted] = await db
		.delete(prayerReflections)
		.where(eq(prayerReflections.id, reflectionId))
		.returning({ id: prayerReflections.id });
	return Boolean(deleted);
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
