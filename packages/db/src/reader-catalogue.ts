import type { BookGroup, VersePresenceKind } from "./scripture-catalogue";

/*
 * Fixed facts about the Bible reader: its settings, its book group names and the
 * sentences it writes. This file has no database imports so the browser can use it.
 */

export const readingTextSizes = [
	"standard",
	"large",
	"larger",
	"largest",
] as const;
export type ReadingTextSize = (typeof readingTextSizes)[number];

/** Scripture's size in pixels for each setting, and the word shown for it. */
export const readingTextSizeDetails: Record<
	ReadingTextSize,
	{ label: string; pixels: number }
> = {
	standard: { label: "Standard", pixels: 20 },
	large: { label: "Large", pixels: 22 },
	larger: { label: "Larger", pixels: 25 },
	largest: { label: "Largest", pixels: 28 },
};

/**
 * The app used to have three text sizes. Each old size moves up one name, so the
 * text stays about the size people chose: the old "Default" (16 px) becomes
 * "Large", the new default.
 */
export const readingTextSizeFromOldSetting: Record<
	"small" | "default" | "large",
	ReadingTextSize
> = { small: "standard", default: "large", large: "larger" };

export const verseLayouts = ["verse", "paragraph"] as const;
export type VerseLayout = (typeof verseLayouts)[number];

export const pageColours = ["light", "dark", "system"] as const;
export type PageColour = (typeof pageColours)[number];

export const lineLengths = ["narrow", "default", "wide"] as const;
export type LineLength = (typeof lineLengths)[number];

export const browseTestaments = ["old", "new"] as const;
export type BrowseTestament = (typeof browseTestaments)[number];

export type ReadingPreferences = {
	browseTestament: BrowseTestament;
	lineLength: LineLength;
	pageColour: PageColour;
	readerHintSeen: boolean;
	showSectionHeadings: boolean;
	showVerseNumbers: boolean;
	textSize: ReadingTextSize;
	/** Null until the member chooses one, so the reader can use the first available. */
	traditionSlug: string | null;
	translationAbbreviation: string | null;
	verseLayout: VerseLayout;
	welcomeCompleted: boolean;
};

export const defaultReadingPreferences: ReadingPreferences = {
	browseTestament: "old",
	lineLength: "default",
	pageColour: "light",
	readerHintSeen: false,
	showSectionHeadings: false,
	showVerseNumbers: true,
	textSize: "large",
	traditionSlug: null,
	translationAbbreviation: null,
	verseLayout: "verse",
	welcomeCompleted: false,
};

/**
 * The heading a book sits under on Browse. The stored groups are finer than
 * readers need, so several share one heading. Acts is stored as "History" but
 * reads better as the start of the church.
 */
export function readerBookGroup(
	group: BookGroup | null,
	testament: "old" | "new",
) {
	switch (group) {
		case "Law":
			return "Law";
		case "History":
			return testament === "new" ? "The early church" : "History";
		case "Poetry & wisdom":
			return "Poetry and wisdom";
		case "Major prophets":
		case "Minor prophets":
			return "Prophets";
		case "Gospels":
			return "Gospels";
		case "Pauline epistles":
		case "General epistles":
			return "Letters";
		case "Apocalyptic":
			return "Prophecy";
		case "Deuterocanonical":
			return "Deuterocanonical books";
		case null:
			return "Other books";
	}
}

/** "Psalm 23", not "Psalms 23": one psalm is a psalm. */
export function chapterLabel(bookName: string, chapter: number) {
	return `${bookName === "Psalms" ? "Psalm" : bookName} ${chapter}`;
}

/** Groups verse numbers into runs: [28, 29, 30, 33] becomes [[28, 30], [33, 33]]. */
export function verseRuns(verseNumbers: readonly number[]) {
	const sorted = [...new Set(verseNumbers)].sort((a, b) => a - b);
	const runs: Array<[first: number, last: number]> = [];
	for (const verse of sorted) {
		const current = runs.at(-1);
		if (current && verse === current[1] + 1) current[1] = verse;
		else runs.push([verse, verse]);
	}
	return runs;
}

/** "Romans 8:28–30, 33" for verses 28, 29, 30 and 33 of Romans 8. */
export function selectionLabel(
	bookName: string,
	chapter: number,
	verseNumbers: readonly number[],
) {
	const runs = verseRuns(verseNumbers)
		.map(([first, last]) => (first === last ? `${first}` : `${first}–${last}`))
		.join(", ");
	return `${chapterLabel(bookName, chapter)}:${runs}`;
}

export type MissingVerseNote = {
	/** The note sits under this verse. */
	afterVerse: number;
	explanation: string;
	question: string;
};

/**
 * Explains a verse number this translation skips, so readers don't think text is
 * missing. Staff record only what happened (for example, "3 John 1:15 is part of
 * verse 14 in the KJV"), so the sentence is written here from that record.
 * A bracketed verse still has its words, so it needs no note.
 */
export function missingVerseNote(input: {
	includedInVerse: number | null;
	kind: VersePresenceKind;
	translationName: string;
	verse: number;
}): MissingVerseNote | null {
	const { includedInVerse, kind, translationName, verse } = input;
	const question = `Why is there no verse ${verse}?`;
	switch (kind) {
		case "included_in":
			if (includedInVerse === null) return null;
			return {
				afterVerse: includedInVerse,
				explanation: `Some Bibles split this verse in two. In the ${translationName}, those words are all in verse ${includedInVerse}.`,
				question,
			};
		case "omitted_footnote":
			return {
				afterVerse: verse - 1,
				explanation: `The oldest copies of the Bible don't have these words, so the ${translationName} puts them in a footnote instead of the main text.`,
				question,
			};
		case "not_in_translation":
			return {
				afterVerse: verse - 1,
				explanation: `The oldest copies of the Bible don't have these words, so the ${translationName} leaves them out.`,
				question,
			};
		case "bracketed":
			return null;
	}
}

/**
 * The groups the study panel shows, in the order it shows them, and the kinds of
 * published content in each. Readers only ever see these plain names.
 */
export const studyGroups = [
	{
		key: "explanation",
		name: "Explanation",
		hint: "What this verse means",
		kinds: ["verse_commentary", "passage_commentary"],
	},
	{
		key: "word_meanings",
		name: "Word meanings",
		hint: "The Greek or Hebrew words behind the English",
		kinds: ["original_language_note"],
	},
	{
		key: "different_views",
		name: "Different views",
		hint: "Where Christians read this differently",
		kinds: ["interpretive_question"],
	},
	{
		key: "related_verses",
		name: "Related verses",
		hint: "Other verses on the same thought",
		kinds: ["cross_reference"],
	},
	{
		key: "testament_links",
		name: "Old and New Testament links",
		hint: "Where the New Testament quotes or echoes the Old",
		kinds: ["canonical_relationship"],
	},
	{
		key: "about_the_text",
		name: "About the text",
		hint: "How these words came down to us",
		kinds: ["textual_note", "textual_variant"],
	},
] as const;

export type StudyGroupKey = (typeof studyGroups)[number]["key"];

export const studyContentKinds: readonly string[] = studyGroups.flatMap(
	(group) => group.kinds,
);

export function studyGroupOfKind(kind: string): StudyGroupKey | null {
	return (
		studyGroups.find((group) =>
			(group.kinds as readonly string[]).includes(kind),
		)?.key ?? null
	);
}
