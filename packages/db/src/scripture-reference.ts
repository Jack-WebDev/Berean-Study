import { eq, max, sql } from "drizzle-orm";

import { parseOutlineRange } from "./book-overview";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { bookAliases } from "./schema/book_aliases";
import { books } from "./schema/books";
import { canonBooks } from "./schema/canon_books";

/**
 * Splits "1 John 2:3" into its book and its numbers. The book's name can itself
 * start with a number, so the numbers are only what comes last. Returns null if
 * the part after the name isn't a readable range.
 */
export function splitScriptureReference(text: string) {
	const match = /^(.*?[^\d\s:–—-])\s*(\d[\d\s:–—-]*)?$/.exec(text.trim());
	if (!match?.[1]) return null;

	const rangeText = match[2]?.trim() ?? null;
	const range = rangeText ? parseOutlineRange(rangeText) : null;
	if (rangeText && !range) return null;

	return { bookText: match[1], range };
}

/**
 * Finds the book a typed reference belongs to, and refuses one that can't be right.
 * Verses are entered over time and may not exist yet, so a verse number can't be
 * checked here. A chapter can, against the most any canon allows that book.
 */
export async function resolveScriptureReference(
	client: DbExecutor,
	text: string,
) {
	const reference = splitScriptureReference(text);
	if (!reference) {
		throw new GovernanceError(
			`We can't read "${text}". Write it like Romans 8:28 or 1 John 2:1-6.`,
		);
	}

	const name = reference.bookText.toLowerCase();
	const [book] = await client
		.select({ id: books.id, name: books.name })
		.from(books)
		.leftJoin(bookAliases, eq(bookAliases.bookId, books.id))
		.where(
			sql`lower(${books.name}) = ${name} OR lower(${books.shortName}) = ${name} OR lower(${bookAliases.alias}) = ${name}`,
		)
		.limit(1);
	if (!book) {
		throw new GovernanceError(
			`We can't find a book called "${reference.bookText}".`,
		);
	}

	if (reference.range) {
		const [limit] = await client
			.select({ value: max(canonBooks.chapterLimit) })
			.from(canonBooks)
			.where(eq(canonBooks.bookId, book.id));
		if (limit?.value && reference.range.to.chapter > limit.value) {
			throw new GovernanceError(
				`${book.name} has ${limit.value} chapters, so "${text}" can't be right.`,
			);
		}
	}

	return { bookId: book.id, bookName: book.name };
}
