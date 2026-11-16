import type { db } from "./index";
import {
	getLibraryDestinationCounts,
	type LibraryDestinationCounts,
} from "./library-destination-counts";
import { listRecentChapters } from "./reader";
import { getLibraryReadingState } from "./reader-home";
import {
	listRecentLibraryActivity,
	type RecentLibraryActivity,
} from "./recent-library-activity";

type DbClient = typeof db;

export type LibraryOverview = {
	continueReading: Awaited<ReturnType<typeof getLibraryReadingState>>;
	destinationCounts: LibraryDestinationCounts;
	recentActivity: RecentLibraryActivity[];
	recentlyStudied: Awaited<ReturnType<typeof listRecentChapters>>;
};

/** Returns only the compact summaries needed by the Library landing page. */
export async function getLibraryOverview(
	db: DbClient,
	userId: string,
): Promise<LibraryOverview> {
	const [continueReading, destinationCounts, recentActivity, recentlyStudied] =
		await Promise.all([
			getLibraryReadingState(db, userId),
			getLibraryDestinationCounts(db, userId),
			listRecentLibraryActivity(db, userId),
			listRecentChapters(db, userId, 5),
		]);

	return {
		continueReading,
		destinationCounts,
		recentActivity,
		recentlyStudied,
	};
}
