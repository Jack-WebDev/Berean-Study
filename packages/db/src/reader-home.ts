import { desc, eq } from "drizzle-orm";

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

export async function getReaderHomeOverview(
	userId: string,
): Promise<ReaderHomeOverview> {
	const [continueReading] = await db
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

	const recentlyRead = await db
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
		.limit(4);

	return { continueReading: continueReading ?? null, recentlyRead };
}
