import { z } from "zod";

/*
 * A book's overview: the first content written through review. This file has no
 * database imports so the browser can use it for the editor and its gap check.
 */

export const bookOverviewSchema = z.object({
	summary: z.string().trim().max(300),
	author: z.string().trim().max(200),
	approximateDate: z.string().trim().max(100),
	writtenFrom: z.string().trim().max(200),
	firstReaders: z.string().trim().max(200),
	keyVerse: z.string().trim().max(100),
	keyThemes: z.array(z.string().trim().min(1).max(60)).max(12),
	outline: z
		.array(
			z.object({
				range: z.string().trim().max(30),
				heading: z.string().trim().max(120),
			}),
		)
		.max(60),
});

export type BookOverview = z.infer<typeof bookOverviewSchema>;

export const emptyBookOverview: BookOverview = {
	summary: "",
	author: "",
	approximateDate: "",
	writtenFrom: "",
	firstReaders: "",
	keyVerse: "",
	keyThemes: [],
	outline: [],
};

/** Every part of an overview in reading order, so two revisions can be compared. */
export function overviewFields(overview: BookOverview) {
	return [
		{ label: "Summary", text: overview.summary },
		{ label: "Author", text: overview.author },
		{ label: "Approximate date", text: overview.approximateDate },
		{ label: "Written from", text: overview.writtenFrom },
		{ label: "First readers", text: overview.firstReaders },
		{ label: "Key verse", text: overview.keyVerse },
		{ label: "Key themes", text: overview.keyThemes.join(", ") },
		{
			label: "Outline",
			text: overview.outline
				.map(({ heading, range }) => `${range} ${heading}`)
				.join("\n"),
		},
	];
}

export type OutlineRange = {
	from: { chapter: number; verse: number | null };
	to: { chapter: number; verse: number | null };
};

/** Reads "1:1–4:25", "3:1-20", "5–8" or "9". Returns null if it can't. */
export function parseOutlineRange(text: string): OutlineRange | null {
	const match = /^(\d+)(?::(\d+))?(?:\s*[-–—]\s*(\d+)(?::(\d+))?)?$/.exec(
		text.trim(),
	);
	if (!match) return null;

	const fromChapter = Number(match[1]);
	const fromVerse = match[2] ? Number(match[2]) : null;
	const second = match[3] ? Number(match[3]) : null;
	const third = match[4] ? Number(match[4]) : null;

	// "3:1-20" is a run of verses in one chapter. "1-4" is a run of chapters.
	const sameChapter = fromVerse !== null && second !== null && third === null;
	const toChapter = sameChapter ? fromChapter : (second ?? fromChapter);
	const toVerse = sameChapter ? second : (third ?? (second ? null : fromVerse));

	if (fromChapter < 1 || toChapter < fromChapter) return null;
	if (
		toChapter === fromChapter &&
		fromVerse !== null &&
		toVerse !== null &&
		toVerse < fromVerse
	) {
		return null;
	}

	return {
		from: { chapter: fromChapter, verse: fromVerse },
		to: { chapter: toChapter, verse: toVerse },
	};
}

/**
 * What an outline leaves out or repeats, across the whole book. These are prompts
 * and don't block anything. Verse counts may not exist yet, so this works by
 * chapter, and a chapter split between two rows isn't treated as repeated.
 */
export function outlineCoverage(
	outline: BookOverview["outline"],
	chapterCount: number,
) {
	const unreadableRanges: string[] = [];
	const coverage = new Map<number, number>();

	for (const { range } of outline) {
		const parsed = parseOutlineRange(range);
		if (!parsed) {
			if (range.trim()) unreadableRanges.push(range);
			continue;
		}
		for (
			let chapter = parsed.from.chapter;
			chapter <= parsed.to.chapter;
			chapter += 1
		) {
			const splitHere =
				(chapter === parsed.from.chapter && (parsed.from.verse ?? 1) > 1) ||
				(chapter === parsed.to.chapter && parsed.to.verse !== null);
			coverage.set(chapter, (coverage.get(chapter) ?? 0) + (splitHere ? 0 : 1));
		}
	}

	const nothingToCompare = outline.length === 0;
	const missingChapters: number[] = [];
	if (!nothingToCompare) {
		for (let chapter = 1; chapter <= chapterCount; chapter += 1) {
			if (!coverage.has(chapter)) missingChapters.push(chapter);
		}
	}

	return {
		missingChapters,
		repeatedChapters: [...coverage]
			.filter(([, rows]) => rows > 1)
			.map(([chapter]) => chapter)
			.sort((a, b) => a - b),
		unreadableRanges,
	};
}
