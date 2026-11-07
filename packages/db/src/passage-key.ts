import { parseOutlineRange } from "./book-overview";
import type { VerseRange } from "./commentary-body";

/*
 * A way to name verses that doesn't depend on them having been entered yet, such
 * as "romans:8:18-8:30". This file has no database imports so the browser can use it.
 */

export type PassageRange = VerseRange & { bookSlug: string };

/** Stands in for a chapter's last verse, whatever that turns out to be. */
export const THROUGH_CHAPTER_END = 999;

export function passageKey({ bookSlug, from, to }: PassageRange) {
	const start = `${bookSlug}:${from.chapter}:${from.verse}`;
	return from.chapter === to.chapter && from.verse === to.verse
		? start
		: `${start}-${to.chapter}:${to.verse}`;
}

/** Reads a passage back from its key. Null if the key isn't one. */
export function parsePassageKey(key: string): PassageRange | null {
	const match = /^([a-z0-9-]+):(\d+):(\d+)(?:-(\d+):(\d+))?$/.exec(key);
	if (!match?.[1]) return null;
	const from = { chapter: Number(match[2]), verse: Number(match[3]) };
	const to =
		match[4] === undefined
			? from
			: { chapter: Number(match[4]), verse: Number(match[5]) };
	const inOrder =
		from.chapter < to.chapter ||
		(from.chapter === to.chapter && from.verse <= to.verse);
	if (from.chapter < 1 || from.verse < 1 || !inOrder) return null;
	return { bookSlug: match[1], from, to };
}

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
