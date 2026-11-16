import type { DbExecutor } from "./db-executor";
import {
	getReadingPlace,
	listRecentChapters,
	type ReadingPlace,
	type RecentChapter,
} from "./reader";

export type ReaderHomeOverview = {
	/** Where the member is in the Bible reader, if they've started. */
	continueReading: ReadingPlace | null;
	recentlyRead: RecentChapter[];
};

export type LibraryReadingState = {
	continueReading: ReaderHomeOverview["continueReading"];
	lastStudiedAt: Date | null;
};

export async function getReaderHomeOverview(
	client: DbExecutor,
	userId: string,
): Promise<ReaderHomeOverview> {
	return {
		continueReading: await getReadingPlace(client, userId),
		recentlyRead: await listRecentChapters(client, userId, 4),
	};
}

/** Returns the member's place in the Bible and when they were last there, for the Library overview. */
export async function getLibraryReadingState(
	client: DbExecutor,
	userId: string,
): Promise<LibraryReadingState> {
	const continueReading = await getReadingPlace(client, userId);
	return {
		continueReading,
		lastStudiedAt: continueReading?.updatedAt ?? null,
	};
}
