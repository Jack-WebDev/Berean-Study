import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { getReadingPlace, type ReadingPlace } from "./reader";
import { books } from "./schema/books";
import { passages } from "./schema/passages";
import { readingHistory } from "./schema/reading_history";

export type ReaderHomeOverview = {
	/** Where the member is in the Bible reader, if they've started. */
	continueReading: ReadingPlace | null;
	recentlyRead: Array<{
		bookName: string;
		passageId: number;
		title: string | null;
		visitedAt: Date;
	}>;
};

export type RecentPassage = ReaderHomeOverview["recentlyRead"][number];

export type LibraryReadingState = {
	continueReading: ReaderHomeOverview["continueReading"];
	lastStudiedAt: Date | null;
};

type DbClient = typeof db;

export async function getReaderHomeOverview(
	userId: string,
): Promise<ReaderHomeOverview> {
	const [continueReading, recentlyRead] = await Promise.all([
		getReadingPlace(db, userId),
		listRecentPassages(db, userId, 4),
	]);

	return { continueReading, recentlyRead };
}

/** Returns the member's place in the Bible and when they were last there, for the Library overview. */
export async function getLibraryReadingState(
	db: DbClient,
	userId: string,
): Promise<LibraryReadingState> {
	const continueReading = await getReadingPlace(db, userId);
	return {
		continueReading,
		lastStudiedAt: continueReading?.updatedAt ?? null,
	};
}

/** Returns a small, newest-first subset of passages from the member's reading history. */
export async function listRecentPassages(
	db: DbClient,
	userId: string,
	limit = 5,
): Promise<RecentPassage[]> {
	return db
		.select({
			bookName: books.name,
			passageId: passages.id,
			title: passages.title,
			visitedAt: readingHistory.visitedAt,
		})
		.from(readingHistory)
		.innerJoin(passages, eq(passages.id, readingHistory.passageId))
		.innerJoin(books, eq(books.id, passages.bookId))
		.where(eq(readingHistory.userId, userId))
		.orderBy(desc(readingHistory.visitedAt))
		.limit(limit);
}
