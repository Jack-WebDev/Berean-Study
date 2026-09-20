import { desc, eq } from "drizzle-orm";

import type { createDb } from "./index";
import { collections } from "./schema/collections";
import { notes } from "./schema/notes";
import { prayers } from "./schema/prayers";
import { testimonies } from "./schema/testimonies";

type DbClient = ReturnType<typeof createDb>;

export type RecentLibraryActivity = {
	id: number;
	kind: "collection" | "note" | "prayer" | "testimony";
	title: string;
	updatedAt: Date;
};

/** Returns the user's most recently created or updated personal study material. */
export async function listRecentLibraryActivity(
	db: DbClient,
	userId: string,
	limit = 6,
): Promise<RecentLibraryActivity[]> {
	const [noteRows, collectionRows, prayerRows, testimonyRows] =
		await Promise.all([
			db
				.select({
					id: notes.id,
					title: notes.title,
					updatedAt: notes.updatedAt,
				})
				.from(notes)
				.where(eq(notes.userId, userId))
				.orderBy(desc(notes.updatedAt), desc(notes.id))
				.limit(limit),
			db
				.select({
					id: collections.id,
					title: collections.name,
					updatedAt: collections.updatedAt,
				})
				.from(collections)
				.where(eq(collections.userId, userId))
				.orderBy(desc(collections.updatedAt), desc(collections.id))
				.limit(limit),
			db
				.select({
					id: prayers.id,
					title: prayers.title,
					updatedAt: prayers.updatedAt,
				})
				.from(prayers)
				.where(eq(prayers.userId, userId))
				.orderBy(desc(prayers.updatedAt), desc(prayers.id))
				.limit(limit),
			db
				.select({
					id: testimonies.id,
					title: testimonies.title,
					updatedAt: testimonies.updatedAt,
				})
				.from(testimonies)
				.where(eq(testimonies.userId, userId))
				.orderBy(desc(testimonies.updatedAt), desc(testimonies.id))
				.limit(limit),
		]);

	const activity: RecentLibraryActivity[] = [
		...noteRows.map((item) => ({
			...item,
			kind: "note" as const,
			title: item.title.trim() || "Untitled note",
		})),
		...collectionRows.map((item) => ({ ...item, kind: "collection" as const })),
		...prayerRows.map((item) => ({ ...item, kind: "prayer" as const })),
		...testimonyRows.map((item) => ({ ...item, kind: "testimony" as const })),
	];

	return activity
		.slice()
		.sort((left, right) => {
			const updatedAtDifference =
				right.updatedAt.getTime() - left.updatedAt.getTime();
			return updatedAtDifference || right.id - left.id;
		})
		.slice(0, limit);
}
