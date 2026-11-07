import { describe, expect, it } from "vitest";

import {
	checkVerseText,
	diffWords,
	formatVerseList,
	type PasteOptions,
	parsePastedPassage,
} from "../src/verse-text-tools";

const defaults: PasteOptions = {
	keepLineBreaks: false,
	removeHeadings: true,
	removeMarks: true,
};

describe("reading a pasted passage", () => {
	it("takes verse numbers out of the text, even on one line", () => {
		const { verses } = parsePastedPassage(
			"29 For whom he did foreknow. 30 Moreover whom he did predestinate.",
			defaults,
		);
		expect(verses).toEqual([
			{ number: 29, text: "For whom he did foreknow." },
			{ number: 30, text: "Moreover whom he did predestinate." },
		]);
	});

	it("handles each verse on its own line, and numbers set in superscript", () => {
		const { verses } = parsePastedPassage(
			"²⁹For whom he did foreknow.\n³⁰Moreover whom he did predestinate.",
			defaults,
		);
		expect(verses.map(({ number }) => number)).toEqual([29, 30]);
		expect(verses[0]?.text).toBe("For whom he did foreknow.");
	});

	it("handles chapter:verse references", () => {
		const { verses } = parsePastedPassage(
			"8:29 For whom he did foreknow. 8:30 Moreover whom.",
			defaults,
		);
		expect(verses).toEqual([
			{ number: 29, text: "For whom he did foreknow." },
			{ number: 30, text: "Moreover whom." },
		]);
	});

	it("leaves numbers in the wording alone", () => {
		const { verses } = parsePastedPassage(
			"1 He fasted for 2 days and for 40 nights. 2 Then he rose.",
			defaults,
		);
		expect(verses).toEqual([
			{ number: 1, text: "He fasted for 2 days and for 40 nights." },
			{ number: 2, text: "Then he rose." },
		]);
	});

	it("accepts a verse that starts in lower case", () => {
		const { verses } = parsePastedPassage(
			"38 For I am sure that neither death nor life, 39 nor height nor depth.",
			defaults,
		);
		expect(verses.map(({ number }) => number)).toEqual([38, 39]);
	});

	it("removes footnote letters and cross-reference marks only when asked", () => {
		const raw = "28 And we know[a] that all things(A) work.";
		expect(parsePastedPassage(raw, defaults).verses[0]?.text).toBe(
			"And we know that all things work.",
		);
		expect(
			parsePastedPassage(raw, { ...defaults, removeMarks: false }).verses[0]
				?.text,
		).toBe(raw.slice(3));
	});

	it("removes section headings and reports them, only when asked", () => {
		const raw =
			"Life Through the Spirit\n1 There is therefore now.\n2 For the law.";
		const parsed = parsePastedPassage(raw, defaults);
		expect(parsed.removedHeadings).toEqual(["Life Through the Spirit"]);
		expect(parsed.verses).toHaveLength(2);

		const kept = parsePastedPassage(
			"1 There is therefore now.\nA Heading Here\n2 For the law.",
			{ ...defaults, removeHeadings: false },
		);
		expect(kept.verses[0]?.text).toContain("A Heading Here");
	});

	it("keeps line breaks for poetry only when asked", () => {
		const raw =
			"1 The Lord is my shepherd,\nI shall not want.\n2 He makes me lie down.";
		expect(parsePastedPassage(raw, defaults).verses[0]?.text).toBe(
			"The Lord is my shepherd, I shall not want.",
		);
		expect(
			parsePastedPassage(raw, { ...defaults, keepLineBreaks: true }).verses[0]
				?.text,
		).toBe("The Lord is my shepherd,\nI shall not want.");
	});

	it("reports verses skipped in the middle", () => {
		const { missing, verses } = parsePastedPassage(
			"20 He said this.\n22 Then they went.",
			defaults,
		);
		expect(verses.map(({ number }) => number)).toEqual([20, 22]);
		expect(missing).toEqual([21]);
	});

	it("finds nothing in text without verse numbers", () => {
		expect(parsePastedPassage("No numbers here.", defaults).verses).toEqual([]);
	});
});

describe("automatic checks", () => {
	function codes(text: string) {
		return checkVerseText(text).map(({ code }) => code);
	}

	it("passes clean text", () => {
		expect(codes("Jesus wept.")).toEqual([]);
	});

	it("spots a verse number left in the text and marks where it is", () => {
		const [check] = checkVerseText("33 Who shall lay any thing?");
		expect(check?.code).toBe("leading_number");
		expect(check?.ranges).toEqual([[0, 2]]);
	});

	it("spots a number inside the text", () => {
		expect(codes("He rose. 34 Who condemns?")).toContain("number_inside");
	});

	it("spots double spaces, straight quotes and missing end punctuation", () => {
		expect(codes("Who  shall.")).toEqual(["double_space"]);
		expect(codes('He said, "Come."')).toEqual(["straight_quotes"]);
		expect(codes("Who shall separate us")).toEqual(["no_end_punctuation"]);
	});

	it("accepts curly quotes and a closing quote at the end", () => {
		expect(codes("He said, “Come.”")).toEqual([]);
	});
});

describe("comparing wordings", () => {
	it("marks what was added and removed", () => {
		expect(diffWords("to them that love", "to all that love God")).toEqual([
			{ kind: "same", text: "to " },
			{ kind: "removed", text: "them" },
			{ kind: "added", text: "all" },
			{ kind: "same", text: " that love" },
			{ kind: "added", text: " God" },
		]);
	});

	it("rebuilds both wordings exactly", () => {
		const before = "a b  c d";
		const after = "a x c  d e";
		const changes = diffWords(before, after);
		const rebuild = (skip: string) =>
			changes
				.filter(({ kind }) => kind !== skip)
				.map(({ text }) => text)
				.join("");
		expect(rebuild("added")).toBe(before);
		expect(rebuild("removed")).toBe(after);
	});
});

describe("listing verses", () => {
	it("shortens runs of three or more", () => {
		expect(formatVerseList([23, 24])).toBe("23, 24");
		expect(formatVerseList([9, 1, 2, 3])).toBe("1–3, 9");
		expect(formatVerseList([7])).toBe("7");
	});
});
