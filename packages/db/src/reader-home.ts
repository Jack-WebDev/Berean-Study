import { and, desc, eq } from "drizzle-orm";
import type { createDb } from "./index";
import { db } from "./index";
import { books } from "./schema/books";
import { passages } from "./schema/passages";
import { readingHistory } from "./schema/reading_history";
import { readingPositions } from "./schema/reading_positions";

export type ReaderHomeOverview = {
	continueReading: {
		bookName: string;
		passageId: number;
		title: string | null;
	} | null;
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

type DbClient = ReturnType<typeof createDb>;

export async function getReaderHomeOverview(
	userId: string,
): Promise<ReaderHomeOverview> {
	const [continueReading, recentlyRead] = await Promise.all([
		getReadingPosition(db, userId),
		listRecentPassages(db, userId, 4),
	]);

	return { continueReading, recentlyRead };
}

/** Returns the reading position and its latest matching history entry for the Library overview. */
export async function getLibraryReadingState(
	db: DbClient,
	userId: string,
): Promise<LibraryReadingState> {
	const continueReading = await getReadingPosition(db, userId);

	if (!continueReading) {
		return { continueReading: null, lastStudiedAt: null };
	}

	const [lastHistoryEntry] = await db
		.select({ visitedAt: readingHistory.visitedAt })
		.from(readingHistory)
		.where(
			and(
				eq(readingHistory.userId, userId),
				eq(readingHistory.passageId, continueReading.passageId),
			),
		)
		.orderBy(desc(readingHistory.visitedAt))
		.limit(1);

	return {
		continueReading,
		lastStudiedAt: lastHistoryEntry?.visitedAt ?? null,
	};
}

async function getReadingPosition(db: DbClient, userId: string) {
	const [position] = await db
		.select({
			bookName: books.name,
			passageId: passages.id,
			title: passages.title,
		})
		.from(readingPositions)
		.innerJoin(passages, eq(passages.id, readingPositions.passageId))
		.innerJoin(books, eq(books.id, passages.bookId))
		.where(eq(readingPositions.userId, userId))
		.limit(1);

	return position ?? null;
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
