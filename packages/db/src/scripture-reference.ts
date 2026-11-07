import { eq, max, sql } from "drizzle-orm";

import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import {
	type PassageRange,
	parsePassageKey,
	passageKey,
	splitScriptureReference,
	THROUGH_CHAPTER_END,
} from "./passage-key";
import { formatPassageReference } from "./passages";
import { bookAliases } from "./schema/book_aliases";
import { books } from "./schema/books";
import { canonBooks } from "./schema/canon_books";

export { splitScriptureReference };

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
		.select({
			id: books.id,
			name: books.name,
			slug: books.slug,
			testament: books.testament,
		})
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

	return {
		bookId: book.id,
		bookName: book.name,
		bookSlug: book.slug,
		testament: book.testament,
	};
}

function chapterLabel(bookName: string, from: number, to: number) {
	if (from !== to) return `${bookName} ${from}–${to}`;
	return `${bookName === "Psalms" ? "Psalm" : bookName} ${from}`;
}

/** A passage written the same way wherever it's shown: "Rom 8:31" becomes "Romans 8:31". */
export function passageLabel(
	bookName: string,
	{ from, to }: Pick<PassageRange, "from" | "to">,
) {
	if (to.verse === THROUGH_CHAPTER_END) {
		return chapterLabel(bookName, from.chapter, to.chapter);
	}
	return formatPassageReference(
		bookName,
		[from.chapter, from.verse],
		[to.chapter, to.verse],
	);
}

/**
 * Checks a typed reference and works out which verses it means. Naming only
 * chapters means those whole chapters.
 */
export async function resolvePassage(client: DbExecutor, text: string) {
	const { bookId, bookName, bookSlug, testament } =
		await resolveScriptureReference(client, text);
	const range = splitScriptureReference(text)?.range;
	if (!range) throw new GovernanceError("Include a chapter, like Romans 8.");
	const passage: PassageRange = {
		bookSlug,
		from: { chapter: range.from.chapter, verse: range.from.verse ?? 1 },
		to: {
			chapter: range.to.chapter,
			verse: range.to.verse ?? THROUGH_CHAPTER_END,
		},
	};
	return {
		bookId,
		bookName,
		key: passageKey(passage),
		label: passageLabel(bookName, passage),
		passage,
		testament,
	};
}

/** The book behind a passage's key, and the passage in words. Refuses a key that can't be real. */
export async function readPassageKey(client: DbExecutor, key: string) {
	const passage = parsePassageKey(key);
	if (!passage) throw new GovernanceError("These verses can't be read.");
	const [book] = await client
		.select({ id: books.id, name: books.name, testament: books.testament })
		.from(books)
		.where(eq(books.slug, passage.bookSlug));
	if (!book) throw new GovernanceError("This book no longer exists.");
	return {
		bookId: book.id,
		bookName: book.name,
		key,
		label: passageLabel(book.name, passage),
		passage,
		testament: book.testament,
	};
}
