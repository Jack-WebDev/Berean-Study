import { describe, expect, it } from "vitest";

import {
	chapterLabel,
	missingVerseNote,
	readerBookGroup,
	readingTextSizeFromOldSetting,
	selectionLabel,
	studyGroupOfKind,
	verseRuns,
} from "../src/reader-catalogue";

describe("selection labels", () => {
	it("joins neighbouring verses into ranges", () => {
		expect(verseRuns([33, 28, 30, 29])).toEqual([
			[28, 30],
			[33, 33],
		]);
		expect(selectionLabel("Romans", 8, [28, 29, 30, 33])).toBe(
			"Romans 8:28–30, 33",
		);
		expect(selectionLabel("John", 3, [16])).toBe("John 3:16");
	});

	it("calls one psalm a psalm", () => {
		expect(chapterLabel("Psalms", 23)).toBe("Psalm 23");
		expect(selectionLabel("Psalms", 23, [1, 2])).toBe("Psalm 23:1–2");
	});
});

describe("missing verse notes", () => {
	it("explains a verse whose words are inside another, under that verse", () => {
		expect(
			missingVerseNote({
				includedInVerse: 14,
				kind: "included_in",
				translationName: "King James Version",
				verse: 15,
			}),
		).toEqual({
			afterVerse: 14,
			explanation:
				"Some Bibles split this verse in two. In the King James Version, those words are all in verse 14.",
			question: "Why is there no verse 15?",
		});
	});

	it("explains a left-out verse under the verse before it", () => {
		expect(
			missingVerseNote({
				includedInVerse: null,
				kind: "not_in_translation",
				translationName: "English Standard Version",
				verse: 21,
			}),
		).toMatchObject({ afterVerse: 20, question: "Why is there no verse 21?" });
	});

	it("says nothing about a bracketed verse, which still has its words", () => {
		expect(
			missingVerseNote({
				includedInVerse: null,
				kind: "bracketed",
				translationName: "King James Version",
				verse: 9,
			}),
		).toBeNull();
	});
});

describe("book groups", () => {
	it("uses the reader's group names", () => {
		expect(readerBookGroup("Minor prophets", "old")).toBe("Prophets");
		expect(readerBookGroup("Major prophets", "old")).toBe("Prophets");
		expect(readerBookGroup("History", "old")).toBe("History");
		expect(readerBookGroup("History", "new")).toBe("The early church");
		expect(readerBookGroup("General epistles", "new")).toBe("Letters");
		expect(readerBookGroup("Apocalyptic", "new")).toBe("Prophecy");
	});
});

describe("study groups", () => {
	it("puts each kind of content under its reader-facing group", () => {
		expect(studyGroupOfKind("verse_commentary")).toBe("explanation");
		expect(studyGroupOfKind("passage_commentary")).toBe("explanation");
		expect(studyGroupOfKind("textual_variant")).toBe("about_the_text");
		expect(studyGroupOfKind("theme")).toBeNull();
	});
});

describe("old text sizes", () => {
	it("moves each old size up one name", () => {
		expect(readingTextSizeFromOldSetting).toEqual({
			default: "large",
			large: "larger",
			small: "standard",
		});
	});
});
