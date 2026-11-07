import { and, eq, max } from "drizzle-orm";

import type { DbExecutor } from "./db-executor";
import { canonBooks } from "./schema/canon_books";
import { canonTraditions } from "./schema/canon_traditions";
import { protestantCanonSlug } from "./scripture-catalogue";

/**
 * The most chapters any canon allows this book, or null if no canon has decided.
 * All canons share one set of chapters, so the longest decides what can exist.
 */
export async function highestChapterLimit(client: DbExecutor, bookId: number) {
	const [row] = await client
		.select({ value: max(canonBooks.chapterLimit) })
		.from(canonBooks)
		.where(eq(canonBooks.bookId, bookId));
	return row?.value ?? null;
}

/**
 * The six translations follow the Protestant canon, so a chapter outside it may
 * not be in any of them, and nobody has chosen where its text comes from yet.
 */
export async function isBeyondProtestantCanon(
	client: DbExecutor,
	bookId: number,
	chapter: number,
) {
	const [row] = await client
		.select({ limit: canonBooks.chapterLimit })
		.from(canonBooks)
		.innerJoin(canonTraditions, eq(canonTraditions.id, canonBooks.canonId))
		.where(
			and(
				eq(canonBooks.bookId, bookId),
				eq(canonTraditions.slug, protestantCanonSlug),
			),
		);
	return row?.limit === null || row?.limit === undefined || chapter > row.limit;
}
