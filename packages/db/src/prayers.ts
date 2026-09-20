import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";

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

export type LibraryReflection = PrayerReflection & {
	prayer: {
		category: string | null;
		content: string;
		createdAt: Date;
		id: number;
		title: string;
	};
	prayerReflectionCount: number;
};

export type ListLibraryReflectionsInput = {
	category?: string;
	limit: number;
	offset: number;
	query?: string;
	sort: "oldest" | "recent";
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
	const prayer = await db.transaction(async (tx) => {
		const [updatedPrayer] = await tx
			.update(prayers)
			.set({
				category: input.category,
				content: input.content,
				title: input.title,
			})
			.where(and(eq(prayers.id, input.id), eq(prayers.userId, userId)))
			.returning();
		if (!updatedPrayer) return null;

		if (input.passageId !== undefined) {
			await tx
				.delete(prayerPassages)
				.where(eq(prayerPassages.prayerId, updatedPrayer.id));
			if (input.passageId) {
				await tx
					.insert(prayerPassages)
					.values({ passageId: input.passageId, prayerId: updatedPrayer.id });
			}
		}

		return updatedPrayer;
	});
	if (!prayer) return null;
	return getPrayer(db, userId, prayer.id);
}

export async function createPrayer(
	db: DbClient,
	userId: string,
	input: CreatePrayerInput,
): Promise<PrayerSummary> {
	const prayer = await db.transaction(async (tx) => {
		const [createdPrayer] = await tx
			.insert(prayers)
			.values({
				category: input.category,
				content: input.content,
				title: input.title,
				userId,
			})
			.returning();

		if (!createdPrayer) throw new Error("Unable to create prayer.");
		if (input.passageId) {
			await tx
				.insert(prayerPassages)
				.values({ passageId: input.passageId, prayerId: createdPrayer.id });
		}

		return createdPrayer;
	});
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

/** Returns a page of reflections with their parent-prayer context. */
export async function listLibraryReflections(
	db: DbClient,
	userId: string,
	input: ListLibraryReflectionsInput,
): Promise<{ reflections: LibraryReflection[]; total: number }> {
	const conditions = [eq(prayers.userId, userId)];
	if (input.category) conditions.push(eq(prayers.category, input.category));
	if (input.query) {
		const query = `%${escapeLikePattern(input.query)}%`;
		const searchCondition = or(
			ilike(prayerReflections.content, query),
			ilike(prayers.title, query),
		);
		if (searchCondition) conditions.push(searchCondition);
	}

	const where = and(...conditions);
	const [rows, totalRows] = await Promise.all([
		db
			.select({
				content: prayerReflections.content,
				createdAt: prayerReflections.createdAt,
				id: prayerReflections.id,
				prayerCategory: prayers.category,
				prayerContent: prayers.content,
				prayerCreatedAt: prayers.createdAt,
				prayerId: prayerReflections.prayerId,
				prayerTitle: prayers.title,
			})
			.from(prayerReflections)
			.innerJoin(prayers, eq(prayerReflections.prayerId, prayers.id))
			.where(where)
			.orderBy(
				input.sort === "oldest"
					? asc(prayerReflections.createdAt)
					: desc(prayerReflections.createdAt),
				input.sort === "oldest"
					? asc(prayerReflections.id)
					: desc(prayerReflections.id),
			)
			.limit(input.limit)
			.offset(input.offset),
		db
			.select({ total: count() })
			.from(prayerReflections)
			.innerJoin(prayers, eq(prayerReflections.prayerId, prayers.id))
			.where(where),
	]);
	const total = totalRows[0]?.total ?? 0;

	const counts = await getReflectionCounts(db, [
		...new Set(rows.map((row) => row.prayerId)),
	]);
	return {
		reflections: rows.map((row) => ({
			content: row.content,
			createdAt: row.createdAt,
			id: row.id,
			prayerId: row.prayerId,
			prayer: {
				category: row.prayerCategory,
				content: row.prayerContent,
				createdAt: row.prayerCreatedAt,
				id: row.prayerId,
				title: row.prayerTitle,
			},
			prayerReflectionCount: counts.get(row.prayerId) ?? 0,
		})),
		total: Number(total),
	};
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

function escapeLikePattern(value: string) {
	return value.replace(/[\\%_]/g, "\\$&");
}
