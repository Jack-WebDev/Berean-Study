import { count, eq } from "drizzle-orm";

import type { createDb } from "./index";
import { bookmarks } from "./schema/bookmarks";
import { collections } from "./schema/collections";
import { highlights } from "./schema/highlights";
import { notes } from "./schema/notes";
import { prayers } from "./schema/prayers";
import { testimonies } from "./schema/testimonies";

type DbClient = ReturnType<typeof createDb>;

export type LibraryDestinationCounts = {
	collections: number;
	notes: number;
	prayersAndTestimonies: number;
	saved: number;
};

/** Returns the item totals displayed on the member's Library landing page. */
export async function getLibraryDestinationCounts(
	db: DbClient,
	userId: string,
): Promise<LibraryDestinationCounts> {
	const [
		notesCount,
		collectionsCount,
		highlightsCount,
		bookmarksCount,
		prayersCount,
		testimoniesCount,
	] = await Promise.all([
		countRows(db, notes, userId),
		countRows(db, collections, userId),
		countRows(db, highlights, userId),
		countRows(db, bookmarks, userId),
		countRows(db, prayers, userId),
		countRows(db, testimonies, userId),
	]);

	return {
		collections: collectionsCount,
		notes: notesCount,
		prayersAndTestimonies: prayersCount + testimoniesCount,
		saved: highlightsCount + bookmarksCount,
	};
}

async function countRows(
	db: DbClient,
	table:
		| typeof bookmarks
		| typeof collections
		| typeof highlights
		| typeof notes
		| typeof prayers
		| typeof testimonies,
	userId: string,
) {
	const [result] = await db
		.select({ value: count() })
		.from(table)
		.where(eq(table.userId, userId));

	return result?.value ?? 0;
}
