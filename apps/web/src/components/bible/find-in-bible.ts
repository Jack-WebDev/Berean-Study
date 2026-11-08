import { chapterLabel } from "@berean-study/db/reader-catalogue";
import { bookCatalogue } from "@berean-study/db/scripture-catalogue";

/*
 * The Browse search box (HANDOFF Screen 4). It works out what someone typed as
 * they type: a verse ("John 3:16", "jn3:16", "john 3 16"), a chapter
 * ("Romans 8"), or the start of a book's name ("rom"). Only books in the reader's
 * own book list are found, with their chapter counts from that list.
 */

export type SearchableBook = {
	chapterCount: number | null;
	name: string;
	slug: string;
};

export type FindResult =
	| {
			kind: "place";
			bookSlug: string;
			chapter: number;
			label: string;
			verse: number | null;
	  }
	| {
			kind: "book";
			bookSlug: string;
			chapterCount: number | null;
			label: string;
	  };

/** Lower case, no full stops, no spaces: "1 Jn." and "1jn" match. */
function squash(text: string) {
	return text.toLowerCase().replace(/[.\s]/g, "");
}

/** Every way of writing each book's name: "John", "Jn", "Jhn"… */
const namesBySlug = new Map(
	bookCatalogue.map((book) => [
		book.slug,
		[book.name, book.shortName, ...book.aliases].map(squash),
	]),
);

/** A book name, then a chapter, then perhaps a verse after ":", "." or a space. */
const referencePattern =
	/^(\d?\s*[a-z][a-z\s.]*?)\s*(\d+)(?:\s*[:.\s]\s*(\d+))?$/;

const maxBookResults = 6;

export function findInBible(
	query: string,
	books: readonly SearchableBook[],
): FindResult[] {
	const typed = query.trim().toLowerCase().replace(/\s+/g, " ");
	if (!typed) return [];
	const names = (book: SearchableBook) =>
		namesBySlug.get(book.slug) ?? [squash(book.name)];

	const reference = referencePattern.exec(typed);
	if (reference?.[1] && reference[2]) {
		const bookText = squash(reference[1]);
		const book = books.find((candidate) => names(candidate).includes(bookText));
		const chapter = Number(reference[2]);
		const verse = reference[3] ? Number(reference[3]) : null;
		if (
			book &&
			chapter >= 1 &&
			(book.chapterCount === null || chapter <= book.chapterCount) &&
			(verse === null || verse >= 1)
		) {
			const label = chapterLabel(book.name, chapter);
			return [
				{
					bookSlug: book.slug,
					chapter,
					kind: "place",
					label: verse ? `${label}:${verse}` : label,
					verse,
				},
			];
		}
		return [];
	}

	const start = squash(typed);
	return books
		.filter((book) => names(book).some((name) => name.startsWith(start)))
		.slice(0, maxBookResults)
		.map((book) => ({
			bookSlug: book.slug,
			chapterCount: book.chapterCount,
			kind: "book" as const,
			label: book.name,
		}));
}
