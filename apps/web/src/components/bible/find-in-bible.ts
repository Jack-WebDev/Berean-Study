import { chapterLabel } from "@berean-study/db/reader-catalogue";
import {
	bookCatalogue,
	bookNameKey,
} from "@berean-study/db/scripture-catalogue";

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

/** Every way of writing each book's name: "John", "Jn", "Jhn"… */
const namesBySlug = new Map(
	bookCatalogue.map((book) => [
		book.slug,
		[book.name, book.shortName, ...book.aliases].map(bookNameKey),
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
		namesBySlug.get(book.slug) ?? [bookNameKey(book.name)];

	const reference = referencePattern.exec(typed);
	if (reference?.[1] && reference[2]) {
		const bookText = bookNameKey(reference[1]);
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

	const start = bookNameKey(typed);
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
