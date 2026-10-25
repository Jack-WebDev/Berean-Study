import type { VerseBlockAttributes } from "./document-types";

export function isValidVerseBlock(
	attributes: Partial<VerseBlockAttributes> | null | undefined,
): attributes is VerseBlockAttributes {
	if (!attributes) return false;
	const {
		book,
		bookId,
		chapter,
		passageId,
		translation,
		verseEnd,
		verseStart,
	} = attributes;
	return (
		typeof book === "string" &&
		Boolean(book.trim()) &&
		typeof translation === "string" &&
		Boolean(translation.trim()) &&
		[bookId, chapter, passageId, verseStart, verseEnd].every(
			isPositiveInteger,
		) &&
		(verseEnd as number) >= (verseStart as number)
	);
}

/** Formats a verse range as "Acts 17:11" or "Acts 17:10–12". */
export function formatVerseReference({
	book,
	chapter,
	verseEnd,
	verseStart,
}: Pick<VerseBlockAttributes, "book" | "chapter" | "verseEnd" | "verseStart">) {
	const verses =
		verseEnd > verseStart ? `${verseStart}–${verseEnd}` : `${verseStart}`;
	return `${book} ${chapter}:${verses}`;
}

function isPositiveInteger(value: unknown) {
	return typeof value === "number" && Number.isInteger(value) && value > 0;
}
