import { describe, expect, it } from "vitest";

import {
	extractDocumentHeadings,
	getCharacterCount,
	getEstimatedReadingTime,
	getWordCount,
} from "../src/document-utils";
import type { RichTextDocument } from "../src/types";

const document: RichTextDocument = {
	content: [
		{
			attrs: { level: 2 },
			content: [{ text: "Historical Context", type: "text" }],
			type: "heading",
		},
		{
			content: [{ text: "Three simple words.", type: "text" }],
			type: "paragraph",
		},
		{
			attrs: { level: 3 },
			content: [{ text: "Roman Background", type: "text" }],
			type: "heading",
		},
	],
	type: "doc",
};

describe("rich-text document utilities", () => {
	it("counts visible words and characters", () => {
		expect(getWordCount(document)).toBe(7);
		expect(getCharacterCount(document)).toBe(
			"Historical Context Three simple words. Roman Background".length,
		);
		expect(getEstimatedReadingTime(document, 4)).toBe(2);
	});

	it("extracts ordered H2/H3 outline entries", () => {
		expect(extractDocumentHeadings(document)).toEqual([
			{ id: "heading-1", level: 2, text: "Historical Context" },
			{ id: "heading-2", level: 3, text: "Roman Background" },
		]);
	});
});
