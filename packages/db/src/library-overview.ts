import type { createDb } from "./index";
import {
	getLibraryDestinationCounts,
	type LibraryDestinationCounts,
} from "./library-destination-counts";
import { getLibraryReadingState, listRecentPassages } from "./reader-home";
import {
	listRecentLibraryActivity,
	type RecentLibraryActivity,
} from "./recent-library-activity";

type DbClient = ReturnType<typeof createDb>;

export type LibraryOverview = {
	continueReading: Awaited<ReturnType<typeof getLibraryReadingState>>;
	destinationCounts: LibraryDestinationCounts;
	recentActivity: RecentLibraryActivity[];
	recentlyStudied: Awaited<ReturnType<typeof listRecentPassages>>;
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
			listRecentPassages(db, userId),
		]);

	return {
		continueReading,
		destinationCounts,
		recentActivity,
		recentlyStudied,
	};
}
