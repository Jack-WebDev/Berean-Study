import { describe, expect, it } from "vitest";

import { formatPassageReference } from "../src/passages";
import { bookNameFromOneChapter, chapterLabel } from "../src/reader-catalogue";
import { bookNameKey } from "../src/scripture-catalogue";
import { passageLabel } from "../src/scripture-reference";

describe("formatPassageReference", () => {
	it("writes a single verse, a range and a range across chapters", () => {
		expect(formatPassageReference("John", [3, 16], [3, 16])).toBe("John 3:16");
		expect(formatPassageReference("Romans", [8, 1], [8, 4])).toBe(
			"Romans 8:1–4",
		);
		expect(formatPassageReference("Romans", [7, 24], [8, 2])).toBe(
			"Romans 7:24–8:2",
		);
	});

	it("calls one psalm a Psalm, but keeps Psalms across several", () => {
		expect(formatPassageReference("Psalms", [88, 1], [88, 3])).toBe(
			"Psalm 88:1–3",
		);
		expect(formatPassageReference("Psalms", [42, 11], [43, 5])).toBe(
			"Psalms 42:11–43:5",
		);
	});
});

describe("the Psalm rule", () => {
	it("writes one psalm as a Psalm everywhere, and reads it back as the book", () => {
		expect(chapterLabel("Psalms", 23)).toBe("Psalm 23");
		expect(
			passageLabel("Psalms", {
				from: { chapter: 23, verse: 1 },
				to: { chapter: 23, verse: 999 },
			}),
		).toBe("Psalm 23");
		expect(
			passageLabel("Psalms", {
				from: { chapter: 1, verse: 1 },
				to: { chapter: 2, verse: 999 },
			}),
		).toBe("Psalms 1–2");
		expect(bookNameFromOneChapter("Psalm")).toBe("Psalms");
		expect(bookNameFromOneChapter("Romans")).toBe("Romans");
	});
});

describe("matching a typed book name", () => {
	it("ignores case, full stops and spaces", () => {
		for (const typed of ["1 Jn.", "1jn", "1 JN", " 1 jn "]) {
			expect(bookNameKey(typed)).toBe("1jn");
		}
	});
});
