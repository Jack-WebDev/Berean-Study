import type { ReadingPlace } from "@berean-study/db/reader";

/** The reading page address for a member's saved place, such as /bible/romans/8?verse=28. */
export function readingPlaceHref(
	place: Pick<ReadingPlace, "book" | "chapter" | "verse">,
) {
	return `/bible/${place.book.slug}/${place.chapter}?verse=${place.verse}`;
}
